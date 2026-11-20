(function(){
 'use strict';
 const SERVICE='https://geo.vancouver.ca/hosting/rest/services/Hosted/Sites_over_5_acres/FeatureServer/0';
 const DEFAULT_PORTAL='https://geo.vancouver.ca/portal';
 const $=id=>document.getElementById(id);
 const els={status:$('status'),events:$('events'),load:$('loadBtn'),secure:$('secureBtn'),reset:$('resetBtn'),login:$('loginBtn'),token:$('tokenBtn'),diagnose:$('diagnoseBtn'),bridge:$('bridgeBtn'),bridgeStatus:$('bridgeStatus'),networkStatus:$('networkStatus'),meta:$('meta'),loginStatus:$('loginStatus')};
 let Map, MapView, FeatureLayer, OAuthInfo, identityManager, esriConfig, esriRequest;
 let map, view, liveLayer, busy=false, oauthRegistered=false, portalSignedIn=false, currentPortal='';
 function safe(v){
  return String(v??'')
   .replace(/([?&]token=)[^&\s]+/gi,'$1[redacted]')
   .replace(/(access_token[=:])[A-Za-z0-9._-]+/gi,'$1[redacted]')
   .replace(/(refresh_token[=:])[A-Za-z0-9._-]+/gi,'$1[redacted]')
   .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi,'$1[redacted]')
   .slice(0,650);
 }
 function log(msg){const line='['+new Date().toLocaleTimeString()+'] '+safe(msg);els.events.textContent=(els.events.textContent==='Waiting for test.'?'':els.events.textContent+'\n')+line;els.events.scrollTop=els.events.scrollHeight;}
 function status(msg,kind='info'){els.status.textContent=msg;els.status.dataset.kind=kind;log(msg);}
 function loginState(msg,kind='info'){els.loginStatus.textContent=msg;els.loginStatus.dataset.kind=kind;log(msg);}
 function errText(e){
  const parts=[e?.name, e?.message, e?.details?.httpStatus&&('HTTP '+e.details.httpStatus),e?.details?.messages?.join(' · ')];
  const msg=parts.filter(Boolean).join(' — ') || String(e);
  return safe(msg);
 }
 function setBusy(v){busy=v;for(const el of [els.load,els.secure,els.login,els.token,els.bridge])el.disabled=v;}
 function service(){const u=new URL($('layerUrl').value.trim());if(u.protocol!=='https:')throw Error('FeatureServer URL must be HTTPS');if(!/\/FeatureServer\/\d+\/?$/i.test(u.pathname))throw Error('Feature layer URL should end in /FeatureServer/0');return u.origin+u.pathname.replace(/\/$/,'');}
 function portal(){const u=new URL($('portalUrl').value.trim());if(u.protocol!=='https:')throw Error('Portal URL must be HTTPS');return (u.origin+u.pathname).replace(/\/$/,'');}
 function registerOAuth(){
  if(!OAuthInfo||!identityManager)throw Error('ArcGIS JavaScript SDK has not loaded.');
  const p=portal(),id=$('clientId').value.trim();if(!id)throw Error('Client ID is required.');
  if(oauthRegistered && currentPortal===p)return p;
  esriConfig.portalUrl=p;
  identityManager.registerOAuthInfos([new OAuthInfo({appId:id,portalUrl:p,popup:false,flowType:'auto',authNamespace:'vanmap-gh-pages-oauth-test-v4'})]);
  currentPortal=p; oauthRegistered=true;
  log('OAuth settings registered for '+p+' (Client ID present; no tokens included).');
  return p;
 }
 async function verifyPortal(){
  const p=registerOAuth();
  const credential=await identityManager.checkSignInStatus(p+'/sharing');
  portalSignedIn=true;
  loginState('Signed in to City Portal. Account: '+(credential.userId||'authorized Portal user'), 'success');
  try{
   const response=await esriRequest(p+'/sharing/rest/portals/self',{query:{f:'json'},responseType:'json'});
   const d=response.data||{};
   log('Portal self request succeeded. Portal: '+(d.name||d.portalName||d.id||'available'));
  }catch(e){log('Portal credential exists, but Portal self request failed: '+errText(e));}
  return credential;
 }
 async function signIn(){
  if(busy)return;setBusy(true);
  try{
   const p=registerOAuth();
   loginState('Starting browser-based City SSO at '+p+' …','working');
   log('Signing in. If your browser navigates to City SSO, complete the login and return to this site.');
   await identityManager.getCredential(p+'/sharing');
   await verifyPortal();
   log('City Portal sign-in completed. Next use 2 · Test OAuth → hosting token.');
  }catch(e){loginState('Portal sign-in failed: '+errText(e),'error');status('Portal OAuth sign-in did not complete. Verify the registered redirect URL and Portal access.','error');}
  finally{setBusy(false);}
 }
 async function inspectService(u){
  try{
   const r=await esriRequest(u,{query:{f:'json'},responseType:'json'});
   const d=r.data||{};
   if(d.error)throw Error('Service REST error '+d.error.code+': '+d.error.message);
   log('Hosting server REST metadata succeeded: '+(d.name||d.id||'layer')+'; geometry='+String(d.geometryType||'unknown'));
  }catch(e){log('Hosting server REST metadata failed: '+errText(e));throw e;}
 }
 async function loadLayer(mode='anonymous'){
  if(busy)return;setBusy(true);els.meta.style.display='none';
  try{
   const u=service();
   if(mode==='signed-in'){
    status('Verifying Portal session, then accessing hosting server…','working');
    try{await verifyPortal()}catch(e){throw Error('No active Portal OAuth session: '+errText(e)+'. Use Sign in with City Portal first.');}
   }else{status(mode==='token'?'Testing with a temporary session token…':'Testing anonymous layer access…','working');}
   await inspectService(u);
   const candidate=new FeatureLayer({url:u,outFields:['*'],title:'Sites over 5 acres',popupEnabled:true,
    renderer:{type:'simple',symbol:{type:'simple-fill',color:[33,119,137,0.32],outline:{color:[9,80,104,1],width:1.3}}}});
   await candidate.load();
   log('FeatureLayer loaded. Title: '+candidate.title);
   candidate.popupTemplate=candidate.createPopupTemplate?.()||{title:'Site',content:'ArcGIS feature'};
   if(liveLayer)map.remove(liveLayer);liveLayer=candidate;map.add(liveLayer);
   const extent=candidate.fullExtent;
   if(extent && !extent.isEmpty){try{await view.when();await view.goTo(extent.expand(1.12),{duration:550});log('Map moved to layer extent.');}catch(e){log('Zoom failed: '+errText(e));}}
   let count='Not available';
   try{count=await candidate.queryFeatureCount();log('Layer query succeeded. Count: '+count);}
   catch(e){log('Feature count query failed: '+errText(e));}
   els.meta.textContent='Layer: '+candidate.title+' | Geometry: '+(candidate.geometryType||'unknown')+' | Features: '+count;
   els.meta.style.display='block';
   try{await view.whenLayerView(candidate);log('Map layer view initialized.');}
   catch(e){log('Layer view initialization failed: '+errText(e));}
   status('Success: layer metadata and map layer initialized. Check the map for polygons.','success');
  }catch(e){status('Could not load secured layer: '+errText(e),'error');log('Hint: 498/499 usually means missing/invalid authorization; a CORS error suggests the server/network blocks cross-origin browser requests.');}
  finally{setBusy(false);}
 }
 async function diagnoseBrowser(){
  if(busy)return;
  els.diagnose.disabled=true;
  const results=[];
  const portalREST=portal()+'/sharing/rest/portals/self?f=json';
  const layerREST=service()+'?f=json';
  const test=async (name,url)=>{
    log(name+': native fetch with CORS, no token and no cookies…');
    try {
      const response=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',redirect:'follow',cache:'no-store'});
      let apiError='';
      const kind=response.headers.get('content-type')||'';
      if(kind.includes('json')){
        try { const data=await response.json();if(data?.error)apiError='; ArcGIS REST error '+data.error.code+' '+safe(data.error.message||''); }
        catch(e){apiError='; JSON parse failed';}
      }
      const line=name+': readable HTTP '+response.status+' '+response.statusText+apiError;
      log(line);
      results.push({name,ok:true,message:line});
    }catch(e){
      const line=name+': no readable response — '+safe(e?.message||String(e));
      log(line);
      results.push({name,ok:false,message:line});
      try{
        const opaque=await fetch(url,{method:'GET',mode:'no-cors',credentials:'omit',redirect:'follow',cache:'no-store'});
        log(name+': no-CORS probe completed ('+opaque.type+'). This does not prove the REST service returned valid data; the browser cannot inspect its response.');
      }catch(probeError){log(name+': no-CORS probe also failed — '+safe(probeError?.message||String(probeError)));}
    }
  };
  els.networkStatus.dataset.kind='working';
  els.networkStatus.textContent='Testing from '+location.origin+' (no credentials sent)…';
  try {
    log('Page origin is '+location.origin+'; cross-origin service is '+new URL(layerREST).origin+'.');
    await test('Portal REST',portalREST);
    await test('Hosted layer REST',layerREST);
    const blocked=results.filter(r=>!r.ok).length;
    if(blocked){
      els.networkStatus.dataset.kind='error';
      els.networkStatus.textContent=blocked+' of 2 REST endpoints returned no readable browser response. Open the direct links above and check the browser Console for CORS, local-network access, DNS, TLS or VPN messages. A token cannot repair a browser-blocked request.';
    }else{
      els.networkStatus.dataset.kind='success';
      els.networkStatus.textContent='Both REST endpoints returned readable responses to native fetch. Look for HTTP 498/499 or a REST error in the diagnostics; next, retry Load secured layer after City SSO.';
    }
  }catch(e){els.networkStatus.dataset.kind='error';els.networkStatus.textContent='Browser diagnostic failed: '+errText(e);log('Browser diagnostic failure: '+errText(e));}
  finally{els.diagnose.disabled=false;}
 }
 // This is a narrowly scoped diagnostic. Never send user tokens to arbitrary user-entered URLs.
 function allowedCityEndpoints(){
  const p=portal(), u=service();
  const ph=new URL(p), su=new URL(u);
  if(ph.hostname!=='geo.vancouver.ca'||ph.pathname!=='/portal')throw Error('OAuth diagnostic is restricted to the City Portal host.');
  if(su.hostname!=='geo.vancouver.ca'||!su.pathname.startsWith('/hosting/rest/services/Hosted/'))throw Error('OAuth diagnostic is restricted to the City hosted service.');
  return {p,u,serverBase:su.origin+'/hosting'};
 }
 function bridgeState(message,kind='info'){
  els.bridgeStatus.textContent=message;
  els.bridgeStatus.dataset.kind=kind;
  log(message);
 }
 // POST form values are never included in URLs, diagnostics, or saved application files.
 async function arcgisPost(label,url,fields){
  log(label+': HTTPS form POST (credentials not logged)…');
  let response;
  try{
   response=await fetch(url,{method:'POST',mode:'cors',credentials:'omit',redirect:'follow',
    headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body:new URLSearchParams(fields).toString(),cache:'no-store',referrerPolicy:'no-referrer'});
  }catch(err){log(label+': no readable response — '+safe(err?.message||String(err)));
   return {ok:false,kind:'network',http:null};}
  let data;
  try{data=await response.json()}catch(err){
   log(label+': HTTP '+response.status+' but response was not JSON (likely redirect or gateway).');
   return {ok:false,kind:'non-json',http:response.status};
  }
  if(data?.error){
   log(label+': HTTP '+response.status+'; ArcGIS error '+String(data.error.code||'unknown')+' — '+safe(data.error.message||'request rejected'));
   return {ok:false,kind:'arcgis',code:data.error.code,http:response.status};
  }
  log(label+': readable HTTP '+response.status+'; valid ArcGIS JSON response.');
  return {ok:response.ok,kind:'json',http:response.status,data};
 }
 function registerHostingToken(token,expires){
  const host=allowedCityEndpoints().serverBase+'/rest/services';
  identityManager.registerToken({server:host,token,expires:Number(expires)||Date.now()+10*60*1000,ssl:true});
  log('A hosting token was registered in the ArcGIS identity manager (value hidden).');
 }
 async function testOAuthBridge(){
  if(busy)return;
  setBusy(true);
  let layerReady=false;
  try{
   const {p,u,serverBase}=allowedCityEndpoints();
   bridgeState('Checking City Portal session and hosting-server authorization…','working');
   const cred=await verifyPortal();
   if(!cred?.token){bridgeState('SSO session was found, but the client SDK did not expose a usable OAuth access token.','error');return;}
   // Same service endpoint as the successful temporary-token test, using the OAuth token directly.
   const direct=await arcgisPost('A · OAuth token → hosted layer',u,{f:'json',token:cred.token});
   if(direct.ok && direct.data?.geometryType){
    registerHostingToken(cred.token,cred.expires);
    bridgeState('OAuth token directly authorizes the hosted layer. Trying ArcGIS map rendering…','success');
    layerReady=true;
   }else{
    // For federated ArcGIS Servers, Portal can generate a server-scoped token.
    const exchange=await arcgisPost('B · Portal token → hosting-server token',p+'/sharing/rest/generateToken',
     {f:'json',token:cred.token,serverUrl:serverBase});
    if(exchange.ok && exchange.data?.token){
     const serverToken=exchange.data.token;
     registerHostingToken(serverToken,exchange.data.expires);
     bridgeState('Portal returned a hosting-server token. Trying ArcGIS map rendering…','success');
     layerReady=true;
    }else{
     let msg='SSO works, but the OAuth token did not authorize the hosted layer.';
     if(exchange.kind==='network')msg+=' The Portal server-token exchange is not readable from GitHub Pages; this may require a Portal CORS/reverse-proxy change.';
     else if(exchange.kind==='arcgis')msg+=' Portal rejected the server-token exchange (see ArcGIS error code in diagnostics).';
     else msg+=' The Portal server-token exchange did not return a usable server token.';
     bridgeState(msg,'error');
    }
   }
  }catch(err){bridgeState('OAuth-to-hosting test failed: '+errText(err),'error');}
  finally{setBusy(false);}
  if(layerReady)await loadLayer('signed-in');
 }
 async function useToken(){
  if(busy)return;
  try{
   const token=$('token').value.trim();if(!token)throw Error('Paste a temporary token first.');
   const u=new URL(service());
   const idx=u.pathname.indexOf('/rest/services');if(idx<0)throw Error('Service URL is not under /rest/services.');
   identityManager.registerToken({server:u.origin+u.pathname.slice(0,idx+'/rest/services'.length),token,expires:Date.now()+10*60*1000,ssl:true});
   $('token').value='';log('Temporary token registered in memory. Not saved or logged.');
   await loadLayer('token');
  }catch(e){status('Temporary token test failed: '+errText(e),'error');}
 }
 function reset(){if(liveLayer){map.remove(liveLayer);liveLayer=null;}view.goTo({center:[-123.12,49.26],zoom:11}).catch(()=>{});els.meta.style.display='none';status('Map reset. Portal session preserved.');}
 $('loadBtn').addEventListener('click',()=>loadLayer('anonymous'));
 $('secureBtn').addEventListener('click',()=>loadLayer('signed-in'));
 $('loginBtn').addEventListener('click',signIn);
 $('tokenBtn').addEventListener('click',useToken);
 $('bridgeBtn').addEventListener('click',testOAuthBridge);
 $('diagnoseBtn').addEventListener('click',diagnoseBrowser);
 $('resetBtn').addEventListener('click',reset);
 window.addEventListener('error',e=>{if(e.message)status('Browser script error: '+safe(e.message),'error');});
 window.addEventListener('unhandledrejection',e=>{status('Unexpected browser error: '+errText(e.reason),'error');});
 if(typeof window.require!=='function'){status('ArcGIS Maps SDK did not load from js.arcgis.com. Check network access.','error');return;}
 require(['esri/Map','esri/views/MapView','esri/layers/FeatureLayer','esri/identity/OAuthInfo','esri/identity/IdentityManager','esri/config','esri/request'],
  function(M,V,FL,OI,ID,CFG,REQUEST){
   try{
    Map=M;MapView=V;FeatureLayer=FL;OAuthInfo=OI;identityManager=ID;esriConfig=CFG;esriRequest=REQUEST;
    registerOAuth();
    map=new Map({basemap:null});
    view=new MapView({container:'viewDiv',map,center:[-123.12,49.26],zoom:11,background:{color:[239,242,243,1]},ui:{components:['zoom','attribution']}});
    view.when(()=>log('Map initialized. Use City Portal sign-in, then the OAuth-to-hosting test.')).catch(e=>status('Map initialization failed: '+errText(e),'error'));
    log('ArcGIS SDK loaded. Service address: '+SERVICE);
    status('Ready. To use the secured layer, click 1 · Sign in with City Portal, then 2 · Test OAuth → hosting token.','info');
    verifyPortal().then(()=>log('Existing Portal session restored; ready to load secured layer.'))
     .catch(()=>loginState('Portal session not yet verified. Click Sign in with City Portal.','info'));
   }catch(e){status('Startup failure: '+errText(e),'error');}
  },function(e){status('ArcGIS SDK module import failed: '+errText(e),'error');});
})();