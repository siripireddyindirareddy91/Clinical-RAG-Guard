"""Deterministic fixture evaluation only. Not clinical accuracy."""
import json
from pipeline import embedding, retrieve, classify
from samples import SCENARIOS
chunks=[{'text':s['text'],'chunk_id':str(i),'document_id':str(i),'page':1,'title':s['topic'],'embedding':embedding(s['text']),'citation':f'S{i+1}'} for i,s in enumerate(SCENARIOS)]
rr=[]; precision=[]; recalls=[];tp=fp=fn=0
for i,s in enumerate(SCENARIOS):
    ranked=retrieve(s['question'],chunks,5);ids=[p['document_id'] for p in ranked]
    rr.append(1/(ids.index(str(i))+1) if str(i) in ids else 0);precision.append(int(str(i) in ids)/max(1,len(ids)));recalls.append(int(str(i) in ids))
    evidence=[dict(chunks[i],citation='S1')]
    for text,flag in [(s['text'].split('. ')[0]+'. [S1]',False),(s['bad'],True)]:
        predicted=classify(text,evidence,'C1')['status']!='Supported'
        tp+=int(predicted and flag);fp+=int(predicted and not flag);fn+=int(not predicted and flag)
print(json.dumps({'scope':'Synthetic teaching fixtures only — not clinical accuracy','scenarios':len(SCENARIOS),'retrieval_precision_at_5':sum(precision)/5,'recall_at_5':sum(recalls)/5,'mean_reciprocal_rank':sum(rr)/5,'hallucination_detection_precision':tp/max(1,tp+fp),'hallucination_detection_recall':tp/max(1,tp+fn)},indent=2))
