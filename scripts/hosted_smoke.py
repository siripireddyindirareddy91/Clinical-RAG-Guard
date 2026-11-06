"""Verify the deployed frontend→API→database flow using synthetic data only."""
import sys, httpx
base=sys.argv[1].rstrip('/')
with httpx.Client(base_url=base,timeout=60,follow_redirects=False) as c:
    health=c.get('/api/health'); assert health.status_code==200,health.text[:200]
    demo=c.post('/api/auth/demo'); assert demo.status_code==200,demo.text[:200]
    assert c.get('/api/auth/me').status_code==200
    scenarios=c.get('/api/demo/scenarios').json()
    for i,s in enumerate(scenarios):
        response=c.post('/api/clinical/query',json={'question':s['question'],'scenario':i})
        assert response.status_code==200,response.text[:200]
        q=response.json(); assert q['valid'] and s['bad'] not in q['corrected_answer'],q
        assert all(x['citation_valid'] for x in q['final_claims'])
        pdf=c.get('/api/reports/'+q['id']+'/download?format=pdf'); assert pdf.content.startswith(b'%PDF')
        assert c.get('/api/reports/'+q['id']+'/download?format=csv').status_code==200
        print(f"PASS {s['topic']}: {len(q['claims'])} claims, {q['iteration']} correction(s), PDF/CSV exported",flush=True)
    upload=c.post('/api/documents/upload',files={'file':('smoke.txt',b'This fictional orchid research project recorded violet flowers. The synthetic project evaluated no medication.','text/plain')},data={'title':'Hosted synthetic smoke fixture'})
    assert upload.status_code==200,upload.text[:200]
    doc_id=upload.json()['id']
    assert c.get('/api/documents/'+doc_id+'/chunks').json()
    q=c.post('/api/clinical/query',json={'question':'What flowers were recorded in the orchid research project?','document_ids':[doc_id]}).json()
    assert q['valid'] and q['evidence'][0]['document_id']==doc_id
    stream=c.post('/api/clinical/query/stream',json={'question':scenarios[0]['question'],'scenario':0})
    assert '"type": "result"' in stream.text,stream.text[:200]
    overview=c.get('/api/dashboard/overview').json();assert overview['queries']==7,overview
    assert c.get('/api/audit-logs').json()
    print('PASS upload, indexing, scoped retrieval, SSE, database analytics, audit trail',flush=True)
    for path in ['overview','workspace','library','upload','rag','detector','verification','correction','history','reports','analytics','audit','settings','profile','login','register']:
        assert c.get('/'+path).status_code==200,path
    print('PASS all 16 route responses',flush=True)
