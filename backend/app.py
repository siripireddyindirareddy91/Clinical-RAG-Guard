import csv, io, json, os, secrets, time
from collections import Counter
from datetime import datetime, timezone
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, delete, func
from sqlalchemy.exc import IntegrityError
from database import Session, initialize, User, Document, Chunk, Query, Claim, Evidence, Correction, Execution, Audit, record, uid, URL
from security import current_user, password_hash, password_ok, token, DEMO
from documents import extract, MAX_BYTES
from pipeline import embedding, retrieve, GRAPH, run
from samples import SCENARIOS

initialize()
app=FastAPI(title='MediVerify AI',version='1.0.0',description='AI-assisted evidence assessment. Research use only; no clinical validation.')
app.add_middleware(CORSMiddleware,allow_origins=[os.getenv('FRONTEND_URL','http://localhost:3000')],allow_credentials=True,allow_methods=['GET','POST','DELETE','PATCH'],allow_headers=['Content-Type','Authorization'])
Auth=Annotated[User,Depends(current_user)]
LIMITATIONS='AI-assisted source assessment, not clinical advice. Confidence values are system estimates, not clinical probabilities. Synthetic teaching sources are not medical references. Rule-based checks can miss paraphrases and complex contradictions.'
def user_json(u): return {k:getattr(u,k) for k in ['id','name','email','role','settings','created_at']}
def doc_json(d): return {k:getattr(d,k) for k in ['id','title','filename','category','source','author','publication_year','description','processing_status','synthetic','created_at']}
def own(db,model,id,user):
    item=db.get(model,id)
    if not item or item.user_id!=user.id: raise HTTPException(404,'Record not found.')
    return item
def rate(db,user,action,limit=40):
    cutoff=datetime.fromtimestamp(time.time()-3600,timezone.utc).isoformat()
    count=db.scalar(select(func.count()).select_from(Audit).where(Audit.user_id==user.id,Audit.action==action,Audit.created_at>cutoff))
    if count>=limit: raise HTTPException(429,'Hourly research limit reached. Please try again later.')
def seed(db,user):
    for s in SCENARIOS:
        d=Document(id=uid(),user_id=user.id,title=s['topic']+' · synthetic teaching study',filename=s['topic'].lower().replace(' ','-')+'.txt',source='Synthetic teaching fixture',author='MediVerify Demo',publication_year=2026,synthetic=True)
        db.add(d); db.flush(); db.add(Chunk(document_id=d.id,chunk_text=s['text'],page_number=1,embedding=embedding(s['text']),meta={'synthetic':True,'source_type':'Synthetic teaching fixture'}))
    record(db,user.id,'seed_demo','workspace')
class Credentials(BaseModel):
    email:str=Field(min_length=5,max_length=254,pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    password:str=Field(min_length=10,max_length=128)
    name:str=Field(default='Researcher',min_length=1,max_length=80)
def set_session(response,user):
    response.set_cookie('mv_session',token(user.id),httponly=True,secure=bool(os.getenv('VERCEL')),samesite='lax',max_age=86400,path='/')
@app.post('/api/auth/register')
def register(body:Credentials,response:Response):
    with Session() as db:
        u=User(id=uid(),name=body.name.strip(),email=body.email.lower(),password_hash=password_hash(body.password))
        db.add(u)
        try: db.flush(); seed(db,u); record(db,u.id,'register','user',u.id); db.commit()
        except IntegrityError: db.rollback(); raise HTTPException(409,'An account already exists for this email.')
        set_session(response,u); return user_json(u)
@app.post('/api/auth/login')
def login(body:Credentials,response:Response):
    with Session() as db:
        u=db.scalar(select(User).where(User.email==body.email.lower()))
        if not u or not password_ok(body.password,u.password_hash): raise HTTPException(401,'Email or password is incorrect.')
        record(db,u.id,'login','user',u.id); db.commit(); set_session(response,u); return user_json(u)
@app.post('/api/auth/demo')
def demo(response:Response):
    if not DEMO: raise HTTPException(403,'Demo access is disabled.')
    with Session() as db:
        u=User(id=uid(),name='Demo Researcher',email=secrets.token_hex(12)+'@demo.invalid',password_hash=password_hash(secrets.token_urlsafe(30)))
        db.add(u); db.flush(); seed(db,u); db.commit(); set_session(response,u); return user_json(u)
@app.post('/api/auth/logout')
def logout(response:Response): response.delete_cookie('mv_session',path='/'); return {'ok':True}
@app.get('/api/auth/me')
def me(user:Auth): return user_json(user)
@app.patch('/api/auth/me')
def profile(body:dict,user:Auth):
    with Session() as db:
        u=db.get(User,user.id)
        if 'name' in body:
            name=str(body['name']).strip()[:80]
            if not name: raise HTTPException(422,'Name is required.')
            u.name=name
        if 'settings' in body:
            settings=body['settings']; u.settings={'top_k':max(1,min(int(settings.get('top_k',5)),10)),'max_iterations':max(1,min(int(settings.get('max_iterations',3)),3))}
        record(db,u.id,'update_profile','user',u.id); db.commit(); return user_json(u)
@app.get('/api/demo/scenarios')
def scenarios(): return SCENARIOS
@app.get('/api/health')
def health():
    with Session() as db: db.execute(select(1))
    return {'status':'healthy','service':'MediVerify API','demo_mode':DEMO}
@app.get('/api/system/status')
def status(): return {'status':'operational','demo_mode':DEMO,'storage':'ephemeral demo — data may reset on cold start' if os.getenv('VERCEL') and URL.startswith('sqlite') else 'persistent database','retrieval':'Sentence Transformers + BM25' if os.getenv('EMBEDDING_MODEL') else 'Hashed lexical vectors + BM25 (demo fallback)','generation':'OpenAI-compatible provider' if os.getenv('OPENAI_API_KEY') and not DEMO else 'Deterministic extractive demo','orchestrator':'LangGraph · 8 nodes','limitations':LIMITATIONS}
@app.get('/api/documents')
def documents(user:Auth):
    with Session() as db:
        docs=db.scalars(select(Document).where(Document.user_id==user.id).order_by(Document.created_at.desc())).all()
        return [dict(doc_json(d),chunk_count=db.scalar(select(func.count()).select_from(Chunk).where(Chunk.document_id==d.id))) for d in docs]
@app.post('/api/documents/upload')
async def upload(user:Auth,file:UploadFile=File(...),title:str=Form(''),category:str=Form('Clinical Research'),author:str=Form(''),publication_year:int|None=Form(None),description:str=Form('')):
    data=await file.read(MAX_BYTES+1); chunks=extract(file.filename or '',data)
    if publication_year is not None and not 1800<=publication_year<=2100: raise HTTPException(422,'Publication year must be between 1800 and 2100.')
    with Session() as db:
        rate(db,user,'upload',30)
        count=db.scalar(select(func.count()).select_from(Document).where(Document.user_id==user.id))
        if count>=50: raise HTTPException(400,'Maximum 50 documents in this workspace.')
        d=Document(id=uid(),user_id=user.id,title=(title or file.filename or 'Untitled')[:200],filename=(file.filename or '')[:200],category=category[:80],author=author[:120],publication_year=publication_year,description=description[:2000])
        db.add(d); db.flush()
        for page,text in chunks: db.add(Chunk(document_id=d.id,chunk_text=text,page_number=page,embedding=embedding(text),meta={'source_type':'User upload','year':publication_year}))
        record(db,user.id,'upload','document',d.id); db.commit(); return doc_json(d)
@app.get('/api/documents/{id}')
def document(id:str,user:Auth):
    with Session() as db:
        d=own(db,Document,id,user); return dict(doc_json(d),chunks=[{'id':c.id,'text':c.chunk_text,'page':c.page_number,'meta':c.meta} for c in db.scalars(select(Chunk).where(Chunk.document_id==id))])
@app.get('/api/documents/{id}/chunks')
def chunks(id:str,user:Auth): return document(id,user)['chunks']
@app.delete('/api/documents/{id}')
def remove_document(id:str,user:Auth):
    with Session() as db:
        d=own(db,Document,id,user); db.delete(d); record(db,user.id,'delete','document',id); db.commit(); return {'ok':True,'note':'Prior reports preserve their evidence snapshots.'}
@app.post('/api/documents/{id}/index')
def reindex(id:str,user:Auth):
    with Session() as db:
        d=own(db,Document,id,user)
        for c in db.scalars(select(Chunk).where(Chunk.document_id==id)): c.embedding=embedding(c.chunk_text)
        d.processing_status='Indexed'; record(db,user.id,'reindex','document',id); db.commit(); return doc_json(d)
class Question(BaseModel):
    question:str=Field(min_length=8,max_length=2000)
    document_ids:list[str]=Field(default_factory=list,max_length=50)
    top_k:int=Field(default=5,ge=1,le=10)
    max_iterations:int=Field(default=3,ge=1,le=3)
    draft:str=Field(default='',max_length=12000)
    scenario:int|None=Field(default=None,ge=0,le=4)
def state_for(body,user):
    with Session() as db:
        rate(db,user,'clinical_query',60)
        docs=db.scalars(select(Document).where(Document.user_id==user.id)).all()
        if body.document_ids:
            if not set(body.document_ids).issubset({d.id for d in docs}): raise HTTPException(404,'One or more selected documents are unavailable.')
            docs=[d for d in docs if d.id in body.document_ids]
        all_chunks=[]
        for d in docs:
            for c in db.scalars(select(Chunk).where(Chunk.document_id==d.id)):
                all_chunks.append({'chunk_id':c.id,'document_id':d.id,'title':d.title,'page':c.page_number,'text':c.chunk_text,'embedding':c.embedding,'synthetic':d.synthetic,'source':d.source})
        bad=SCENARIOS[body.scenario]['bad'] if body.scenario is not None and DEMO else ''
        return {'question':body.question,'chunks':all_chunks,'top_k':body.top_k,'max_iterations':body.max_iterations,'draft':body.draft,'demo_bad':bad,'traces':[]}
def persist(state,user,elapsed):
    result={k:v for k,v in state.items() if k not in ('chunks','draft','demo_bad')}
    for p in result.get('evidence',[]): p.pop('embedding',None)
    result['elapsed_ms']=round(elapsed*1000,2); result['limitations']=LIMITATIONS
    result['confidence']=round(sum(c['confidence'] for c in result.get('final_claims',[]))/max(1,len(result.get('final_claims',[]))),3)
    result['coverage']=round(sum(c['status']=='Supported' for c in result['claims'])/max(1,len(result['claims'])),3)
    id=uid(); result['id']=id; result['created_at']=datetime.now(timezone.utc).isoformat()
    with Session() as db:
        q=Query(id=id,user_id=user.id,question=state['question'],generated_answer=state['answer'],corrected_answer=state['corrected_answer'],status='Verified source attribution' if state['valid'] else 'Insufficient evidence',result=json.loads(json.dumps(result)))
        db.add(q); db.flush()
        for c in result['claims']:
            claim=Claim(id=uid(),query_id=id,claim_text=c['text'],verification_status=c['status'],confidence_score=c['confidence'],explanation=c['explanation']); db.add(claim); db.flush()
            c['record_id']=claim.id
            for p in c['evidence']: db.add(Evidence(claim_id=claim.id,document_id=p['document_id'],chunk_id=p['chunk_id'],page_number=p['page'],relevance_score=p['rerank'],evidence_type='contradicting' if c['status']=='Contradicted' else 'matching'))
        for c in result.get('corrections',[]): db.add(Correction(query_id=id,iteration=c['iteration'],original_text=c['original'],corrected_text=c['corrected'],correction_reason=c['reason']))
        for t in result['traces']: db.add(Execution(query_id=id,agent_name=t['name'],execution_status=t['status'],execution_time=t['duration_ms'],output_summary=t['summary']))
        q.result=dict(result); record(db,user.id,'clinical_query','query',id); db.commit()
    return result
@app.post('/api/clinical/query')
def clinical(body:Question,user:Auth):
    start=time.perf_counter(); state=state_for(body,user)
    try: output=run(state)
    except Exception: raise HTTPException(502,'Evidence pipeline failed. Check model configuration and retry.')
    return persist(output,user,time.perf_counter()-start)
@app.post('/api/clinical/query/stream')
def clinical_stream(body:Question,user:Auth):
    state=state_for(body,user)
    def events():
        start=time.perf_counter(); result=dict(state)
        try:
            for update in GRAPH.stream(state,{'recursion_limit':30},stream_mode='updates'):
                for node,values in update.items():
                    result.update(values)
                    yield 'data: '+json.dumps({'type':'stage','stage':values['traces'][-1]})+'\n\n'
            yield 'data: '+json.dumps({'type':'result','result':persist(result,user,time.perf_counter()-start)})+'\n\n'
        except Exception:
            yield 'data: '+json.dumps({'type':'error','message':'Evidence pipeline failed. No successful result was recorded.'})+'\n\n'
    return StreamingResponse(events(),media_type='text/event-stream',headers={'Cache-Control':'no-cache','X-Accel-Buffering':'no'})
@app.get('/api/clinical/queries')
def queries(user:Auth):
    with Session() as db: return [dict(q.result,status=q.status) for q in db.scalars(select(Query).where(Query.user_id==user.id).order_by(Query.created_at.desc()).limit(200))]
@app.get('/api/clinical/queries/{id}')
def query(id:str,user:Auth):
    with Session() as db: return own(db,Query,id,user).result
@app.delete('/api/clinical/queries/{id}')
def remove_query(id:str,user:Auth):
    with Session() as db:
        q=own(db,Query,id,user); db.delete(q); record(db,user.id,'delete','query',id); db.commit(); return {'ok':True}
@app.post('/api/rag/retrieve')
def rag(body:Question,user:Auth):
    state=state_for(body,user); return retrieve(body.question,state['chunks'],body.top_k)
@app.get('/api/rag/explore/{id}')
def explore(id:str,user:Auth): return query(id,user)
@app.post('/api/verification/analyze')
def analyze(body:Question,user:Auth): return clinical(body,user)
@app.get('/api/verification/claims/{id}')
def claim(id:str,user:Auth):
    with Session() as db:
        c=db.get(Claim,id)
        if not c: raise HTTPException(404,'Claim not found.')
        q=own(db,Query,c.query_id,user)
        return next((x for x in q.result['claims'] if x.get('record_id')==id),{'text':c.claim_text,'status':c.verification_status,'explanation':c.explanation})
@app.get('/api/verification/{id}')
def verification(id:str,user:Auth): return query(id,user)
class CorrectionRequest(BaseModel):
    query_id:str
@app.post('/api/correction/run')
def correction(body:CorrectionRequest,user:Auth):
    result=query(body.query_id,user)
    return clinical(Question(question=result['question'],draft=result['answer'],max_iterations=3),user)
@app.get('/api/correction/history/{id}')
def correction_history(id:str,user:Auth): return query(id,user).get('corrections',[])
@app.get('/api/dashboard/overview')
@app.get('/api/dashboard/analytics')
def overview(user:Auth):
    history=queries(user); docs=documents(user); claims=[c for q in history for c in q['claims']]; counts=Counter(c['status'] for c in claims)
    days=Counter(q['created_at'][:10] for q in history)
    return {'queries':len(history),'documents':len(docs),'claims':len(claims),'flagged':sum(c['status']!='Supported' for c in claims),'corrected':sum(bool(q['corrections']) and q['valid'] for q in history),'confidence':round(sum(q['confidence'] for q in history)/max(1,len(history)),3),'processing_ms':round(sum(q['elapsed_ms'] for q in history)/max(1,len(history)),1),'distribution':[{'name':k,'value':counts.get(k,0)} for k in ['Supported','Partially Supported','Unsupported','Contradicted','Insufficient Evidence']],'timeline':[{'date':k,'queries':v,'flagged':sum(sum(c['status']!='Supported' for c in q['claims']) for q in history if q['created_at'].startswith(k))} for k,v in sorted(days.items())],'sources':[{'name':'Synthetic','value':sum(d['synthetic'] for d in docs)},{'name':'User uploads','value':sum(not d['synthetic'] for d in docs)}],'recent':history[:5]}
@app.get('/api/dashboard/recent-activity')
@app.get('/api/audit-logs')
def audits(user:Auth):
    with Session() as db: return [{k:getattr(a,k) for k in ['id','action','resource_type','resource_id','created_at']} for a in db.scalars(select(Audit).where(Audit.user_id==user.id).order_by(Audit.created_at.desc()).limit(200))]
class ReportRequest(BaseModel):
    query_id:str
    format:str=Field(default='pdf',pattern='^(pdf|csv)$')
@app.post('/api/reports/generate')
def generate_report(body:ReportRequest,user:Auth):
    query(body.query_id,user)
    return {'id':body.query_id,'url':f'/api/reports/{body.query_id}/download?format={body.format}'}
@app.get('/api/reports/{id}/download')
def download(id:str,user:Auth,format:str='pdf'):
    result=query(id,user)
    with Session() as db: record(db,user.id,'export_report','query',id); db.commit()
    if format=='csv':
        out=io.StringIO(); writer=csv.writer(out); writer.writerow(['Question',result['question']]); writer.writerow(['Limitations',LIMITATIONS]); writer.writerow(['Claim','Status','System confidence estimate','Explanation','Source','Page'])
        def safe(v): return "'"+v if isinstance(v,str) and v.startswith(('=','+','-','@','\t','\r')) else v
        for c in result['claims']: writer.writerow([safe(c['text']),c['status'],c['confidence'],c['explanation'],'; '.join(p['title'] for p in c['evidence']),'; '.join(str(p['page']) for p in c['evidence'])])
        data=out.getvalue().encode('utf-8-sig'); media='text/csv'
    elif format=='pdf':
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from xml.sax.saxutils import escape
        out=io.BytesIO(); pdf=SimpleDocTemplate(out); style=getSampleStyleSheet(); flow=[]
        def add(text,kind='BodyText'): flow.extend([Paragraph(escape(str(text)).replace('\n','<br/>'),style[kind]),Spacer(1,10)])
        add('MediVerify AI — Evidence Assessment','Title'); add(result['created_at']); add(LIMITATIONS)
        for title,text in [('Research question',result['question']),('Original answer',result['answer']),('Final corrected answer',result['corrected_answer'])]: add(title,'Heading2'); add(text)
        add('Claim-by-claim assessment','Heading2')
        for c in result['claims']: add(f"{c['id']} · {c['status']} · System estimate {c['confidence']:.0%}",'Heading3'); add(c['text']); add(c['explanation'])
        add('Evidence references','Heading2')
        for p in result['evidence']: add(f"[{p['citation']}] {p['title']} · page {p['page']} · chunk {p['chunk_id']}",'Heading3'); add(p['text'])
        add('Correction history','Heading2')
        for c in result['corrections']: add(f"Iteration {c['iteration']}: {c['reason']}"); add('Removed: '+'; '.join(c['removed']))
        add('Execution trace','Heading2')
        for t in result['traces']: add(f"{t['name']}: {t['status']} ({t['duration_ms']} ms)")
        pdf.build(flow); data=out.getvalue(); media='application/pdf'
    else: raise HTTPException(422,'Use pdf or csv.')
    return Response(data,media_type=media,headers={'Content-Disposition':f'attachment; filename="mediverify-{id}.{format}"'})
