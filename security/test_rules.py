import json,urllib.request,urllib.error,base64,time,pathlib,os
BASE='http://127.0.0.1:8788'; PROJECT='demo-etkinlik'
DOCS='/v1/projects/'+PROJECT+'/databases/(default)/documents/'
def call(method,path,data=None,token=None):
    h={'Content-Type':'application/json'}
    if token:h['Authorization']='Bearer '+token
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers=h,method=method)) as r:return r.status,r.read()
    except urllib.error.HTTPError as e:return e.code,e.read()
def jwt(email):
    def enc(d):return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip('=')
    return enc({'alg':'none','typ':'JWT'})+'.'+enc({'iss':'https://securetoken.google.com/'+PROJECT,'aud':PROJECT,'sub':email.split('@')[0],'iat':int(time.time()),'exp':int(time.time())+3600,'email':email,'email_verified':True,'firebase':{'sign_in_provider':'google.com'}})+'.'
def seed(path,fields):
    status,_=call('PATCH',DOCS+path,{'fields':fields},'owner');assert status==200,status
def check(method,path,expected,who=None,data=None):
    status,_=call(method,DOCS+path,data,jwt(who) if who else None)
    assert status==expected,(method,path,who,status,expected)
    results.append({'method':method,'path':path,'actor':who or 'anonymous','status':status})
source=pathlib.Path(os.environ['RULES_FILE']).read_text()
status,body=call('PUT','/emulator/v1/projects/'+PROJECT+':securityRules',{'rules':{'files':[{'name':'firestore.rules','content':source}]}})
assert status==200,(status,body.decode()[:1000])
seed('config/bunny',{'storagePassword':{'stringValue':'synthetic-test-secret'}})
seed('config/bunny/nested/secret',{'test':{'booleanValue':True}})
seed('config/other',{'test':{'booleanValue':True}})
seed('personeller/founder@example.com',{'rol':{'stringValue':'kurucu_mudur'}})
seed('etkinlikler/test',{'status':{'stringValue':'draft'},'filledSpots':{'integerValue':'0'}})
results=[]
for actor in [None,'parent@example.com','emrahby@gmail.com','founder@example.com']:
    for method in ['GET','PATCH','DELETE']:
        check(method,'config/bunny',403,actor,{'fields':{'test':{'booleanValue':True}}} if method=='PATCH' else None)
    check('GET','config?pageSize=1',403,actor)
    check('GET','config/bunny/nested/secret',403,actor)
call('DELETE',DOCS+'config/bunny',token='owner')
for actor in ['emrahby@gmail.com','founder@example.com']:
    check('PATCH','config/bunny',403,actor,{'fields':{'test':{'booleanValue':True}}})
check('GET','config/other',200,'emrahby@gmail.com')
check('GET','config/other',200,'founder@example.com')
check('GET','config/other',403,'parent@example.com')
check('GET','etkinlikler/test',200)
# Reproduce existing unrelated defects without touching production data.
check('PATCH','etkinlikler/test?updateMask.fieldPaths=filledSpots',200,'parent@example.com',{'fields':{'filledSpots':{'integerValue':'1'}}})
check('PATCH','etkinlikler/test?updateMask.fieldPaths=filledSpots',200,'parent@example.com',{'fields':{'filledSpots':{'integerValue':'2'}}})
# Results contain only synthetic emulator identities.
print('PASS',len(results),'checks; secret access blocked for all client roles; unrelated config preserved; draft read/counter replay reproduced')
