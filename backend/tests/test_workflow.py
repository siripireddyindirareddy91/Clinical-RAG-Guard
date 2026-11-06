import io
import pytest
from pipeline import classify, embedding, retrieve, run
from documents import extract
from samples import SCENARIOS

def test_auth_and_isolation(client):
    assert client.get('/api/documents').status_code==401
    account={'email':'researcher@example.test','password':'valid-test-password','name':'Researcher'}
    assert client.post('/api/auth/register',json=account).status_code==200
    assert client.post('/api/auth/register',json=account).status_code==409
    doc=client.get('/api/documents').json()[0]
    assert client.post('/api/auth/logout').status_code==200
    assert client.post('/api/auth/login',json={**account,'password':'incorrect-password'}).status_code==401
    assert client.post('/api/auth/login',json=account).status_code==200
    assert client.post('/api/auth/demo').status_code==200
    assert client.get('/api/documents/'+doc['id']).status_code==404
    assert client.delete('/api/documents/'+doc['id']).status_code==404

@pytest.mark.parametrize('index',range(5))
def test_five_full_scenarios(authenticated,index):
    c=authenticated;s=SCENARIOS[index]
    response=c.post('/api/clinical/query',json={'question':s['question'],'scenario':index})
    assert response.status_code==200,response.text
    q=response.json()
    assert q['valid'] and q['iteration']<=3
    assert any(x['status']!='Supported' for x in q['claims'])
    assert s['bad'] not in q['corrected_answer']
    assert all(x['status']=='Supported' and x['citation_valid'] for x in q['final_claims'])
    assert len(q['traces'])==8
    assert c.get('/api/verification/'+q['id']).status_code==200
    saved=c.get('/api/clinical/queries/'+q['id']).json()
    assert saved['claims'][0]['record_id']
    claim=c.get('/api/verification/claims/'+saved['claims'][0]['record_id'])
    assert claim.status_code==200 and 'evidence' in claim.json()
    pdf=c.get('/api/reports/'+q['id']+'/download?format=pdf')
    assert pdf.status_code==200 and pdf.content.startswith(b'%PDF')
    assert 'Claim,Status' in c.get('/api/reports/'+q['id']+'/download?format=csv').text
    assert c.get('/api/correction/history/'+q['id']).json()
    assert c.get('/api/dashboard/overview').json()['queries']==1
    assert any(a['action']=='clinical_query' for a in c.get('/api/audit-logs').json())

def test_upload_retrieve_delete(authenticated):
    c=authenticated
    r=c.post('/api/documents/upload',files={'file':('teaching.txt',b'This synthetic zebrafish trial assessed an experimental research marker. The research marker was elevated in the synthetic sample.','text/plain')},data={'title':'Research marker'})
    assert r.status_code==200,r.text
    id=r.json()['id'];assert c.get('/api/documents/'+id+'/chunks').json()
    q=c.post('/api/clinical/query',json={'question':'What does the zebrafish trial say about the research marker?','document_ids':[id]}).json()
    assert q['evidence'][0]['document_id']==id and q['valid']
    assert c.post('/api/documents/'+id+'/index').status_code==200
    assert c.delete('/api/documents/'+id).status_code==200
    assert c.get('/api/clinical/queries/'+q['id']).json()['evidence']

def test_upload_validation(authenticated):
    c=authenticated
    assert c.post('/api/documents/upload',files={'file':('bad.exe',b'malware')}).status_code==400
    assert c.post('/api/documents/upload',files={'file':('bad.pdf',b'not pdf')}).status_code==400
    assert c.post('/api/documents/upload',files={'file':('empty.txt',b'')}).status_code==400
    assert c.post('/api/documents/upload',files={'file':('large.txt',b'x'*(4*1024*1024+1))}).status_code==413
    assert c.post('/api/clinical/query',json={'question':'x'}).status_code==422

def test_all_extractors():
    assert extract('test.json',b'{"finding":"synthetic"}')
    assert extract('test.csv',b'topic,finding\nsleep,synthetic')
    from docx import Document
    d=Document();d.add_paragraph('Synthetic test document.');out=io.BytesIO();d.save(out)
    assert extract('test.docx',out.getvalue())[0][0]==1
    import pymupdf
    d=pymupdf.open();page=d.new_page();page.insert_text((40,40),'Synthetic PDF evidence.');data=d.tobytes();d.close()
    assert 'Synthetic PDF' in extract('test.pdf',data)[0][1]

def test_exact_numeric_negation_citation():
    e=[{'citation':'S1','text':'Influenza vaccination did not prevent all infections. Nausea occurred in 5% of the synthetic sample.','chunk_id':'c','document_id':'d','page':1,'rerank':.9}]
    assert classify('Influenza vaccination did not prevent all infections. [S1]',e,'C1')['status']=='Supported'
    assert classify('Influenza vaccination did prevent all infections.',e,'C2')['status']=='Contradicted'
    assert classify('Nausea occurred in 90% of the synthetic sample.',e,'C3')['status']=='Unsupported'
    assert classify('Nausea occurred in 5% of the synthetic sample. [S9]',e,'C4')['status']=='Unsupported'
    assert classify('An entirely unrelated assertion.',[],'C5')['status']=='Insufficient Evidence'

def test_insufficiency_and_stream(authenticated):
    c=authenticated
    result=c.post('/api/clinical/query',json={'question':'What is the quantum teleportation fidelity of qubits?'}).json()
    assert not result['valid'] and not result['evidence']
    stream=c.post('/api/clinical/query/stream',json={'question':SCENARIOS[0]['question'],'scenario':0})
    assert stream.status_code==200 and '"type": "stage"' in stream.text and '"type": "result"' in stream.text
    assert c.post('/api/clinical/query',json={'question':'A sufficiently long research question','document_ids':['other-user-id']}).status_code==404

def test_query_isolation(authenticated):
    c=authenticated;q=c.post('/api/clinical/query',json={'question':SCENARIOS[0]['question']}).json()
    c.post('/api/auth/demo')
    assert c.get('/api/clinical/queries/'+q['id']).status_code==404
    assert c.get('/api/reports/'+q['id']+'/download').status_code==404
    assert c.get('/api/dashboard/overview').json()['queries']==0
