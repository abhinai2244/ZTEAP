const BASE='https://securesoft.atlassian.net';
const { randomUUID } = require('crypto');
const USER=process.env.JIRA_USER, TOKEN=process.env.JIRA_API_TOKEN;
if(!USER||!TOKEN) throw new Error('Missing Jira credentials');
const headers={Authorization:`Basic ${Buffer.from(`${USER}:${TOKEN}`).toString('base64')}`,Accept:'application/json','Content-Type':'application/json'};
async function api(url,options={}){const r=await fetch(BASE+url,{...options,headers});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(`${r.status} ${url}: ${t}`);return d}
(async()=>{
  const issueTypeIds=['10043','10044','10045','10046','10047'];
  const preview=await api('/rest/api/3/workflows/preview',{method:'POST',body:JSON.stringify({projectId:'10034',issueTypeIds})});
  const wf=preview.workflows[0];
  const testing=preview.statuses.find(x=>x.name==='Testing');
  if(!testing) throw new Error('Project-scoped Testing status was not found');
  const testingReference=testing.id;
  const definitions=preview.statuses.map(s=>({id:s.id,description:s.description||'',name:s.name,statusCategory:s.statusCategory,statusReference:s.statusReference}));
  const byName=Object.fromEntries(preview.statuses.map(s=>[s.name,s.statusReference]));
  const desiredStatusReferences=['To Do','In Progress','Testing','Done'].map(name=>byName[name]);
  const statuses=desiredStatusReferences.map((statusReference,i)=>({layout:{x:100+i*200,y:0},properties:{},statusReference}));
  const statusNameByRef=Object.fromEntries(preview.statuses.map(s=>[s.statusReference,s.name]));
  const transitions=wf.transitions.map(t=>({actions:t.actions||[],description:t.description||'',id:t.id,links:t.links||[],name:t.type==='INITIAL'?'Create':(statusNameByRef[t.toStatusReference]||t.name),properties:{},toStatusReference:t.toStatusReference,triggers:t.triggers||[],type:t.type,validators:t.validators||[]}));
  const usedIds=new Set(transitions.map(t=>t.id)); let newId=41; while(usedIds.has(String(newId))) newId+=10;
  if(!transitions.some(t=>t.toStatusReference===testingReference)) transitions.push({actions:[],description:'Move completed implementation into functional and security verification',id:String(newId),links:[],name:'Testing',properties:{},toStatusReference:testingReference,triggers:[],type:'GLOBAL',validators:[]});
  const update={statuses:definitions,workflows:[{defaultStatusMappings:[],description:'Four-stage Scrum workflow for ZTEAP',id:wf.id,startPointLayout:{x:-100,y:-150},statusMappings:[],statuses,transitions,version:wf.version}]};
  try{const validation=await api('/rest/api/3/workflows/update/validation',{method:'POST',body:JSON.stringify({payload:update,validationOptions:{levels:['WARNING','ERROR']}})});console.log('Validation',JSON.stringify(validation));}catch(e){console.error('Validation failed',e.message);throw e}
  const result=await api('/rest/api/3/workflows/update',{method:'POST',body:JSON.stringify(update)});
  console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
