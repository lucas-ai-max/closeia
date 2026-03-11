import{c as T,r as l,j as e,T as N,B as ee,a as M,b as v,d as te,R as G,L as He,N as S,e as b,M as Fe,A as Ye,C as qe,f as Ve,g as Xe}from"./theme-B5Qw5Qu-.js";import{a as W,d as Qe}from"./env-C-P-tgOu.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ke=[["path",{d:"m7 6 5 5 5-5",key:"1lc07p"}],["path",{d:"m7 13 5 5 5-5",key:"1d48rs"}]],Je=T("chevrons-down",Ke);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ze=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]],et=T("circle-question-mark",Ze);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tt=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],nt=T("copy",tt);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ot=[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]],je=T("cpu",ot);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const st=[["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}],["circle",{cx:"9",cy:"5",r:"1",key:"hp0tcf"}],["circle",{cx:"9",cy:"19",r:"1",key:"fkjjf6"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["circle",{cx:"15",cy:"19",r:"1",key:"f4zoj3"}]],we=T("grip-vertical",st);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const it=[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}]],rt=T("message-circle",it);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const at=[["path",{d:"M5 12h14",key:"1ays0h"}]],lt=T("minus",at);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ct=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],dt=T("triangle-alert",ct);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ut=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],pt=T("x",ut),ft=18,oe="#22c55e",P="#3b82f6",Ce={FREE:"Grátis",STARTER:"Starter",PRO:"Pro",TEAM:"Team",ENTERPRISE:"Enterprise"},R={FREE:"#6b7280",STARTER:"#f59e0b",PRO:"#8b5cf6",TEAM:"#3b82f6",ENTERPRISE:"#ec4899"};function ht({text:o,animate:n,cursorColor:i}){const[s,a]=l.useState(n?0:o.length),d=l.useRef(o);l.useEffect(()=>{if(!n){a(o.length);return}const y=d.current;d.current=o,o.startsWith(y)?a(C=>Math.min(C,y.length)):a(0)},[o,n]),l.useEffect(()=>{if(!n||s>=o.length)return;const y=setTimeout(()=>a(C=>C+1),ft);return()=>clearTimeout(y)},[s,o,n]);const g=n&&s<o.length;return e.jsxs(e.Fragment,{children:[e.jsx("span",{children:o.slice(0,s)}),g&&e.jsx("span",{style:{display:"inline-block",width:2,height:13,backgroundColor:i,marginLeft:1,verticalAlign:"text-bottom",animation:"cursorBlink 0.6s step-end infinite"}})]})}function Me({text:o}){const[n,i]=l.useState(!1),s=()=>{navigator.clipboard.writeText(o).then(()=>{i(!0),setTimeout(()=>i(!1),2e3)}).catch(()=>{})};return e.jsxs("button",{onClick:s,title:"Copiar",style:{padding:4,background:"transparent",border:"none",color:n?oe:b,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:10,flexShrink:0},children:[n?e.jsx(qe,{size:12}):e.jsx(nt,{size:12}),n?"Copiado":"Copiar"]})}var _e;const Re=typeof chrome<"u"&&((_e=chrome.runtime)!=null&&_e.getURL)?chrome.runtime.getURL("logo.svg"):"",ne=360,gt="80vh",Te=48,Ie=56;function mt(o){const n=o.target.getRootNode();return n&&"host"in n?n.host:document.getElementById("sales-copilot-root")}function H(){return document.getElementById("sales-copilot-root")}function yt(){const[o,n]=l.useState(null),[i,s]=l.useState(!0),[a,d]=l.useState([]),[g,y]=l.useState([]),[C,B]=l.useState(!1),[Mt,X]=l.useState(""),[ue,pe]=l.useState(null),[Q,fe]=l.useState(!1),[Rt,he]=l.useState(null),[Pe,ie]=l.useState(!1),[j,Oe]=l.useState(null),[A,ge]=l.useState(!1),[re,me]=l.useState(!1),[ye,Be]=l.useState(30),L=l.useRef({startX:0,startY:0,startLeft:0,startTop:0,panelW:ne,panelH:300}),xe=l.useRef(null),be=l.useRef(null),ae=l.useRef(null),Ee=l.useRef(null);l.useEffect(()=>{const t=H();t&&chrome.storage.local.get(["sidebarPosition","sidebarMinimized","sidebarOpen"],r=>{const c=r.sidebarPosition,h=Math.max(0,window.innerWidth-ne-16);t.style.left=((c==null?void 0:c.left)??h)+"px",t.style.top=((c==null?void 0:c.top)??16)+"px";const p=r.sidebarMinimized??!1,E=r.sidebarOpen===!0;ge(p),E||(t.style.width="0",t.style.height="0",t.style.visibility="hidden",t.style.pointerEvents="none")})},[]),l.useEffect(()=>{const t=H();t&&(t.style.width=A?Te+"px":ne+"px",t.style.height=A?Ie+"px":gt,chrome.storage.local.set({sidebarMinimized:A}))},[A]),l.useEffect(()=>{if(i||o)return;chrome.storage.local.set({sidebarOpen:!1}).catch(()=>{});const t=H();t&&(t.style.width="0",t.style.height="0",t.style.visibility="hidden",t.style.pointerEvents="none")},[i,o]);const ve=t=>{if(t.target.closest("button"))return;const r=mt(t);if(!r)return;t.preventDefault();const c=A?Te:ne,h=r.style.left||"",p=r.style.top||"",E=h?parseFloat(h):window.innerWidth-c-16,u=p?parseFloat(p):16,m=Number.isNaN(E)?0:Math.max(0,E),z=Number.isNaN(u)?0:Math.max(0,u);L.current={startX:t.clientX,startY:t.clientY,startLeft:m,startTop:z,panelW:c,panelH:A?Ie:200};const D=x=>{const w=x.clientX-L.current.startX,$=x.clientY-L.current.startY,_=H();if(_){const I=window.innerWidth-L.current.panelW-8,U=window.innerHeight-L.current.panelH-8,Z=Math.max(0,Math.min(I,L.current.startLeft+w)),We=Math.max(0,Math.min(U,L.current.startTop+$));_.style.left=Z+"px",_.style.top=We+"px"}},J=()=>{document.removeEventListener("mousemove",D),document.removeEventListener("mouseup",J);const x=H();x&&chrome.storage.local.set({sidebarPosition:{left:parseFloat(x.style.left||"0")||0,top:parseFloat(x.style.top||"0")||0}})};document.addEventListener("mousemove",D),document.addEventListener("mouseup",J)},Se=()=>ge(t=>!t);l.useEffect(()=>{ke()},[]);const ke=async()=>{const t=await W.getSession();if(n(t),!t){s(!1);return}await W.restoreSessionInMemory(t);let r=await W.fetchOrganizationPlan();!r&&t.refresh_token&&(await new Promise(c=>setTimeout(c,1500)),r=await W.fetchOrganizationPlan()),r&&(Oe(r.plan),r.plan==="FREE"&&ie(!0)),s(!1)},$e=async()=>{await W.logout(),n(null),fe(!1)};l.useEffect(()=>{const t=r=>{r.supabase_session&&ke()};return chrome.storage.local.onChanged.addListener(t),()=>chrome.storage.local.onChanged.removeListener(t)},[]),l.useEffect(()=>{var t;(t=xe.current)==null||t.scrollIntoView({behavior:"smooth"})},[a]),l.useEffect(()=>{var t;re||(t=ae.current)==null||t.scrollIntoView({behavior:"smooth"})},[g,re]);const Ue=()=>{const t=be.current;if(!t)return;const r=t.scrollHeight-t.scrollTop-t.clientHeight<30;me(!r)},Ge=t=>{t.preventDefault();const r=Ee.current;if(!r)return;const c=t.clientY,h=r.getBoundingClientRect(),p=ye,E=m=>{const D=(c-m.clientY)/h.height*100;Be(Math.max(10,Math.min(70,p+D)))},u=()=>{document.removeEventListener("mousemove",E),document.removeEventListener("mouseup",u)};document.addEventListener("mousemove",E),document.addEventListener("mouseup",u)};l.useEffect(()=>{const t=r=>{var c,h,p,E;if(r.type==="TRANSCRIPT_RESULT"){const{text:u,isFinal:m,timestamp:z,speaker:D,role:J}=r.data||{};if(!u)return;const x={text:u,speaker:D||"unknown",role:J||"unknown",isFinal:m??!0,timestamp:z||Date.now()};d(w=>{if(!m){const I=w.length-1,U=I>=0?w[I]:null;if(U&&!U.isFinal&&U.role===x.role){const Z=[...w];return Z[I]=x,Z}return[...w,x]}const $=w.length-1,_=$>=0?w[$]:null;if(_&&!_.isFinal&&_.role===x.role){const I=[...w];return I[$]=x,I}return[...w,x]})}else if(r.type==="STATUS_UPDATE")fe(r.status==="RECORDING"),r.status==="RECORDING"&&typeof r.micAvailable=="boolean"&&he(r.micAvailable),r.status!=="RECORDING"&&he(null),r.status==="PERMISSION_REQUIRED"&&alert("Permissão necessária. Clique no ícone da extensão na barra do navegador para autorizar a captura da aba."),r.status==="PLAN_REQUIRED"&&ie(!0);else if(r.type==="MANAGER_WHISPER")pe({content:r.data.content,urgency:r.data.urgency,timestamp:r.data.timestamp});else if(r.type==="COACH_THINKING")B(!0),X("");else if(r.type==="COACH_TOKEN")X(u=>{var m;return u+(((m=r.data)==null?void 0:m.token)||"")});else if(r.type==="COACH_IDLE"||r.type==="COACH_DONE")B(!1),X("");else if(r.type==="COACHING_MESSAGE"){B(!1),X("");const u=r.data,m={phase:((c=u.metadata)==null?void 0:c.phase)||"S",tip:u.content||"",objection:((h=u.metadata)==null?void 0:h.objection)||null,suggestedResponse:((p=u.metadata)==null?void 0:p.suggested_response)||null,suggestedQuestion:((E=u.metadata)==null?void 0:E.suggested_question)||null,urgency:u.urgency||"medium",timestamp:Date.now()};y(z=>[...z,m])}else r.type==="PLAN_REQUIRED"&&ie(!0)};return chrome.runtime.onMessage.addListener(t),()=>chrome.runtime.onMessage.removeListener(t)},[]);const K={width:"100%",minHeight:0,flex:1,display:"flex",flexDirection:"column",backgroundColor:ee,fontFamily:"system-ui, -apple-system, sans-serif",color:N};if(i)return e.jsx("div",{style:{...K,height:"100%",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("span",{style:{color:M,fontSize:13},children:"Carregando..."})});if(!o)return e.jsxs("div",{style:{...K,height:"100%",padding:24,justifyContent:"center",alignItems:"center",textAlign:"center"},children:[e.jsx("p",{style:{fontSize:13,color:M,marginBottom:8},children:"Este painel só funciona quando você está logado."}),e.jsx("p",{style:{fontSize:14,fontWeight:600,color:N},children:"Faça login no ícone da extensão na barra de ferramentas do navegador."})]});if(A)return e.jsx("div",{onMouseDown:ve,style:{width:"100%",height:"100%",backgroundColor:ee,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui, -apple-system, sans-serif",borderRight:`1px solid ${v}`,cursor:"move",userSelect:"none"},children:e.jsx("button",{onClick:Se,title:"Expandir",style:{width:32,height:32,borderRadius:G,border:`1px solid ${v}`,background:te,color:M,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(we,{size:16,style:{transform:"rotate(-90deg)"}})})});if(Pe){const t=j?Ce[j]||j:"Grátis",r=j&&R[j]||R.FREE;return e.jsxs("div",{style:{...K,height:"100%",padding:24,justifyContent:"center",alignItems:"center",textAlign:"center"},children:[e.jsx(He,{size:40,style:{color:S,marginBottom:16}}),e.jsx("p",{style:{fontSize:16,fontWeight:700,color:N,marginBottom:8},children:"Plano necessário"}),e.jsxs("div",{style:{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8},children:[e.jsx("span",{style:{fontSize:12,color:M},children:"Seu plano atual:"}),e.jsx("span",{style:{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6,backgroundColor:`${r}22`,color:r,border:`1px solid ${r}44`,textTransform:"uppercase"},children:t})]}),e.jsx("p",{style:{fontSize:13,color:M,marginBottom:20,lineHeight:1.5},children:"Para usar o coaching IA em tempo real, ative um plano. Comece com 7 dias grátis!"}),e.jsx("a",{href:`${Qe}/billing`,target:"_blank",rel:"noopener noreferrer",style:{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 24px",borderRadius:G,backgroundColor:S,color:"#fff",fontSize:13,fontWeight:700,textDecoration:"none",cursor:"pointer",border:"none"},children:"Escolher plano"})]})}return e.jsxs("div",{ref:Ee,style:{...K,height:"100%",overflow:"hidden"},children:[e.jsxs("div",{onMouseDown:ve,style:{padding:"8px 12px",borderBottom:`1px solid ${v}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"move",userSelect:"none",flexShrink:0},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx(we,{size:14,style:{color:b}}),Re?e.jsx("img",{src:Re,alt:"HelpSeller",style:{height:18,width:"auto"}}):e.jsx(Fe,{size:14,style:{color:Q?Ye:b}}),e.jsx("div",{style:{fontSize:10,fontWeight:600,color:M},children:Q?"Ao Vivo":"Parado"}),j&&e.jsx("span",{style:{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,backgroundColor:`${R[j]||R.FREE}22`,color:R[j]||R.FREE,border:`1px solid ${R[j]||R.FREE}44`,textTransform:"uppercase",letterSpacing:"0.04em"},children:Ce[j]||j})]}),e.jsxs("div",{style:{display:"flex",gap:4,alignItems:"center"},onClick:t=>t.stopPropagation(),children:[e.jsx("button",{onClick:Se,title:"Minimizar",style:{padding:4,background:"transparent",border:`1px solid ${v}`,borderRadius:G,color:M,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(lt,{size:12})}),e.jsx("button",{onClick:$e,style:{padding:4,fontSize:10,background:"transparent",border:`1px solid ${v}`,borderRadius:G,color:M,cursor:"pointer"},children:"Sair"})]})]}),ue&&e.jsxs("div",{style:{padding:"8px 12px",background:"#1a1a2e",borderBottom:`1px solid ${v}`,flexShrink:0},children:[e.jsxs("div",{style:{fontSize:10,fontWeight:600,marginBottom:4,color:P,textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsx("span",{children:"Gestor diz:"}),e.jsx("button",{onClick:()=>pe(null),style:{background:"none",border:"none",color:b,cursor:"pointer",padding:0,display:"flex"},children:e.jsx(pt,{size:12})})]}),e.jsx("div",{style:{fontSize:12,lineHeight:1.5,color:N},children:ue.content})]}),C&&e.jsx("div",{style:{padding:"6px 12px",borderBottom:`1px solid ${v}`,flexShrink:0,background:"rgba(255,0,122,0.04)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx(je,{size:12,style:{color:S,animation:"spin 1.5s linear infinite"}}),e.jsx("span",{style:{fontSize:10,color:b,fontWeight:600},children:"Coach analisando..."})]})}),e.jsxs("div",{ref:be,onScroll:Ue,style:{flex:"1 1 0",minHeight:0,overflowY:"auto",overflowX:"hidden",position:"relative"},children:[g.length===0?e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",padding:20},children:e.jsx("span",{style:{fontSize:12,color:b},children:"As sugestões do coach aparecerão aqui"})}):g.map((t,r)=>{const c=r===g.length-1;return e.jsxs("div",{style:{borderBottom:`1px solid ${v}`,opacity:c?1:.7,animation:c?"coachPop 0.4s ease":"none"},children:[t.objection&&e.jsx("div",{style:{padding:"8px 12px",background:"rgba(239,68,68,0.12)",borderBottom:"1px solid rgba(239,68,68,0.3)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx(dt,{size:12,style:{color:"#ef4444"}}),e.jsxs("span",{style:{fontSize:11,fontWeight:700,color:"#ef4444",textTransform:"uppercase"},children:["Objeção: ",t.objection]})]})}),t.suggestedResponse&&e.jsxs("div",{style:{padding:"10px 12px",background:c?"rgba(34,197,94,0.10)":"transparent",borderLeft:c?`3px solid ${oe}`:"3px solid transparent"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx(rt,{size:13,style:{color:oe,animation:c?"pulse 1.5s ease-in-out 3":"none"}}),e.jsx("span",{style:{fontSize:11,fontWeight:800,color:oe,textTransform:"uppercase",letterSpacing:"0.04em"},children:"Diga Agora"})]}),e.jsx(Me,{text:t.suggestedResponse})]}),e.jsxs("div",{style:{fontSize:c?14:12,fontWeight:600,lineHeight:1.5,color:N,wordBreak:"break-word"},children:['"',t.suggestedResponse,'"']})]}),t.suggestedQuestion&&e.jsxs("div",{style:{padding:"8px 12px",background:c?"rgba(59,130,246,0.08)":"transparent",borderLeft:c?`3px solid ${P}`:"3px solid transparent"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx(et,{size:12,style:{color:P}}),e.jsx("span",{style:{fontSize:10,fontWeight:700,color:P,textTransform:"uppercase"},children:"Pergunte"})]}),e.jsx(Me,{text:t.suggestedQuestion})]}),e.jsxs("div",{style:{fontSize:c?13:12,fontWeight:500,lineHeight:1.4,color:N,wordBreak:"break-word"},children:['"',t.suggestedQuestion,'"']})]}),!t.suggestedResponse&&!t.suggestedQuestion&&!t.objection&&e.jsxs("div",{style:{padding:"6px 12px",background:c?te:"transparent"},children:[e.jsx("div",{style:{fontSize:10,fontWeight:600,marginBottom:3,color:S,textTransform:"uppercase"},children:"Dica"}),e.jsx("div",{style:{fontSize:11,lineHeight:1.4,color:M},children:t.tip.split(/(\*\*.*?\*\*)/).map((h,p)=>h.startsWith("**")&&h.endsWith("**")?e.jsx("strong",{style:{color:N,fontWeight:600},children:h.slice(2,-2)},p):h)})]})]},`cf-${t.timestamp}-${r}`)}),e.jsx("div",{ref:ae}),re&&g.length>0&&e.jsxs("button",{onClick:()=>{var t;(t=ae.current)==null||t.scrollIntoView({behavior:"smooth"}),me(!1)},style:{position:"sticky",bottom:8,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:20,border:`1px solid ${S}44`,background:`${ee}ee`,color:S,fontSize:10,fontWeight:600,cursor:"pointer",backdropFilter:"blur(8px)",boxShadow:"0 2px 12px rgba(0,0,0,0.5)"},children:[e.jsx(Je,{size:12}),"Nova sugestão"]})]}),e.jsx("div",{onMouseDown:Ge,style:{flexShrink:0,height:6,cursor:"row-resize",display:"flex",alignItems:"center",justifyContent:"center",borderTop:`1px solid ${v}`,borderBottom:`1px solid ${v}`,background:te,userSelect:"none"},children:e.jsx("div",{style:{width:32,height:2,borderRadius:1,background:b}})}),e.jsxs("div",{style:{flexShrink:0,height:`${ye}%`,minHeight:40,overflowY:"auto",overflowX:"hidden",padding:"8px 10px",display:"flex",flexDirection:"column",gap:6,backgroundColor:ee},children:[e.jsxs("div",{style:{fontSize:10,fontWeight:600,marginBottom:2,color:b,textTransform:"uppercase",letterSpacing:"0.05em",flexShrink:0,display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:P},children:"Cliente"}),e.jsx("span",{children:"Transcrição"}),e.jsx("span",{style:{color:S},children:"Você"})]}),a.length===0?e.jsxs("div",{style:{fontSize:12,color:b,display:"flex",alignItems:"center",justifyContent:"center",gap:6,flex:1},children:[e.jsx("span",{children:"Aguardando áudio"}),e.jsxs("span",{style:{display:"inline-flex",gap:3},children:[e.jsx("span",{style:{width:4,height:4,borderRadius:"50%",backgroundColor:b,animation:"aiPulse 1.4s infinite 0s"}}),e.jsx("span",{style:{width:4,height:4,borderRadius:"50%",backgroundColor:b,animation:"aiPulse 1.4s infinite 0.3s"}}),e.jsx("span",{style:{width:4,height:4,borderRadius:"50%",backgroundColor:b,animation:"aiPulse 1.4s infinite 0.6s"}})]})]}):a.map((t,r)=>{const c=r===a.length-1,h=c,p=t.role==="lead",E=p?"rgba(59,130,246,0.12)":"rgba(255,0,122,0.10)",u=p?"rgba(59,130,246,0.25)":"rgba(255,0,122,0.25)",m=p?P:S;return e.jsx("div",{style:{display:"flex",justifyContent:p?"flex-start":"flex-end",animation:c&&t.isFinal?"slideIn 0.2s ease":"none"},children:e.jsxs("div",{style:{maxWidth:"85%",padding:"5px 10px",borderRadius:p?"10px 10px 10px 2px":"10px 10px 2px 10px",backgroundColor:E,border:`1px solid ${u}`,opacity:t.isFinal?1:.7,transition:"opacity 0.2s ease"},children:[e.jsx("div",{style:{fontSize:8,fontWeight:700,color:m,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:1},children:p?"CLIENTE":"VOCÊ"}),e.jsx("div",{style:{fontSize:11,lineHeight:1.45,color:N},children:e.jsx(ht,{text:t.text,animate:h,cursorColor:m})})]})},`${t.timestamp}-${r}`)}),e.jsx("div",{ref:xe})]}),e.jsx("div",{style:{padding:"6px 12px",borderTop:`1px solid ${v}`,flexShrink:0},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",backgroundColor:te,border:`1px solid ${v}`,borderRadius:G,fontSize:10,color:b},children:[e.jsx(je,{size:10,style:Q?{animation:"spin 2s linear infinite",color:S}:{}}),Q?C?"Analisando...":"Escutando ao vivo":"Aguardando gravação"]})}),e.jsx("style",{children:`
                :host *, :host *::before, :host *::after { box-sizing: border-box; }
                :host ::-webkit-scrollbar { width: 5px; }
                :host ::-webkit-scrollbar-track { background: transparent; }
                :host ::-webkit-scrollbar-thumb { background: ${S}40; border-radius: 4px; }
                :host ::-webkit-scrollbar-thumb:hover { background: ${S}70; }
                * { scrollbar-width: thin; scrollbar-color: ${S}40 transparent; }
                div[style*="overflowY"] { word-break: break-word; }
                @keyframes cursorBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                @keyframes aiPulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes coachPop {
                    0% { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    60% { transform: translateY(1px) scale(1.01); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.25); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `})]})}const xt=[/microfone/i,/câmera/i,/camera/i,/desativar/i,/ativar/i,/ctrl\s*\+/i,/alt\s*\+/i,/devices?$/i,/configurações/i,/settings/i,/mute/i,/unmute/i,/turn\s+(on|off)/i,/apresentar/i,/present/i,/chat/i,/meet\.google/i,/participants/i,/participantes/i,/legendas/i,/captions/i,/mais\s+opções/i,/more\s+options/i,/sair/i,/leave/i,/^\d+$/,/^[a-z]$/i];function Ne(o){const n=o.trim();if(n.length<2||n.length>50)return!1;for(const i of xt)if(i.test(n))return!1;if(n.length>10){const i=Math.floor(n.length/2),s=n.substring(0,i).toLowerCase().trim(),a=n.substring(i).toLowerCase().trim();if(s===a)return!1}return!0}function ce(o){let n=o.trim();n=n.replace(/devices$/i,"").trim();for(let i=Math.floor(n.length/2)-2;i<=Math.ceil(n.length/2)+2;i++)if(i>0&&i<n.length){const s=n.substring(0,i).trim(),a=n.substring(i).trim();if(s.toLowerCase()===a.toLowerCase())return s}return n}const bt=["[data-self-name]",".zWGUib",".adnwBd",".YTbUzc",".cS7aqe"];function de(){let o="";const n=new Set;for(const s of bt)try{document.querySelectorAll(s).forEach(a=>{var y;let d="";const g=a;if(g.hasAttribute("data-self-name"))d=(g.getAttribute("data-self-name")||"").trim(),d&&(o=d);else{const C=Array.from(a.childNodes).filter(B=>B.nodeType===Node.TEXT_NODE);C.length>0?d=(C[0].textContent||"").trim():d=((y=(g.innerText||"").split(`
`)[0])==null?void 0:y.trim())||""}d&&Ne(d)&&n.add(d)})}catch{}const i=[];if(n.forEach(s=>{s!==o&&!i.includes(s)&&i.push(s)}),i.length===0){const a=document.title.replace(/\s*[-–]\s*Google Meet.*$/i,"").trim();a&&a!=="Meeting"&&Ne(a)&&i.push(a)}return{selfName:o,otherNames:i}}function Et(){const{selfName:o,otherNames:n}=de(),i=n.filter(s=>s!==o).map(ce).filter(s=>s.length>1);return i.length===0?null:i.join(", ")}function vt(){const{selfName:o,otherNames:n}=de(),i=n.filter(a=>a!==o).map(ce).filter(a=>a.length>1),s=i.length>0?i.join(", "):null;(o||s||i.length>0)&&chrome.runtime.sendMessage({type:"PARTICIPANT_INFO",leadName:s||"Lead",selfName:o||"",allParticipants:i}).catch(()=>{})}let Y=null,q=null;function Ae(o){const{selfName:n,otherNames:i}=de(),s=i.filter(y=>y!==n).map(ce).filter(y=>y.length>1),a=s.length>0?s.join(", "):null,d=a&&a!==o.leadName,g=n&&n!==o.selfName;(d||g)&&(d&&(o.leadName=a||""),g&&(o.selfName=n||""),chrome.runtime.sendMessage({type:"PARTICIPANT_INFO",leadName:a||"Lead",selfName:n||"",allParticipants:s}).catch(()=>{}))}function Le(){if(Y)return;const o={leadName:"",selfName:""};function n(){Ae(o)}n(),Y=setInterval(n,2e3);let i=null;q=new MutationObserver(()=>{i||(i=setTimeout(()=>{i=null,Ae(o)},2e3))}),q.observe(document.body,{childList:!0,subtree:!0})}function St(){Y&&(clearInterval(Y),Y=null),q&&(q.disconnect(),q=null)}function kt(){const o=['[jsname="RKGaOc"]','[jsname="EaZ7Me"]','div[role="region"]'];for(const s of o){const a=document.querySelector(s);if(a){const d=a.querySelector('[aria-label*="microphone" i], [aria-label*="microfone" i], [data-tooltip*="microphone" i], [data-tooltip*="microfone" i]');if(d)return le(d,`${s} > mic button`)}}const n=document.querySelector('button[jsname="BOHaEe"]')||document.querySelector('div[jsname="BOHaEe"]');if(n)return le(n,"jsname BOHaEe");const i=document.querySelectorAll('[aria-label*="microphone" i], [aria-label*="microfone" i]');for(const s of i)if(!(s.closest('[role="listitem"], [role="list"], [jsname="jrQDbd"], [data-participant-id]')||s.getAttribute("role")!=="button"&&s.tagName.toLowerCase()!=="button"))return le(s,"aria-label mic button");return console.log("🎤 [MIC DEBUG] No mic button found, assuming unmuted"),!1}function le(o,n){const i=o.getAttribute("data-is-muted");if(i==="true")return console.log(`🎤 [MIC DEBUG] MUTED via data-is-muted on ${n}`),!0;if(i==="false")return console.log(`🎤 [MIC DEBUG] UNMUTED via data-is-muted on ${n}`),!1;const s=o.getAttribute("aria-pressed");if(s==="true")return console.log(`🎤 [MIC DEBUG] MUTED via aria-pressed on ${n}`),!0;if(s==="false")return console.log(`🎤 [MIC DEBUG] UNMUTED via aria-pressed on ${n}`),!1;const a=(o.getAttribute("aria-label")||o.getAttribute("data-tooltip")||"").toLowerCase();return a.includes("ativar")||a.includes("turn on")||a.includes("unmute")||a.includes("ligar")?(console.log(`🎤 [MIC DEBUG] MUTED via label "${a}" on ${n}`),!0):a.includes("desativar")||a.includes("turn off")||a.includes("mute")||a.includes("desligar")?(console.log(`🎤 [MIC DEBUG] UNMUTED via label "${a}" on ${n}`),!1):(console.log(`🎤 [MIC DEBUG] Could not determine state for ${n}, assuming unmuted`),!1)}let V=null;function jt(){if(V)return;let o=null;console.log("🎤 [MIC MONITOR] Started mic state monitoring"),V=setInterval(()=>{const n=kt();n!==o&&(o=n,console.log(`🎤 [MIC MONITOR] State changed: ${n?"MUTED":"UNMUTED"}`),chrome.runtime.sendMessage({type:"MIC_STATE",muted:n}).catch(()=>{}))},1e3)}function wt(){V&&(clearInterval(V),V=null)}if(window.location.hostname==="meet.google.com"){Le(),jt(),document.readyState!=="complete"&&window.addEventListener("load",()=>Le());const o=()=>{chrome.runtime.sendMessage({type:"TRY_END_CALL"}).catch(()=>{})};window.addEventListener("beforeunload",o),window.addEventListener("pagehide",o)}const f=document.createElement("div");f.id="sales-copilot-root";f.style.cssText="position:fixed;width:0;height:0;z-index:2147483647;transition: width 0.2s ease, height 0.2s ease;border-radius:12px;overflow:hidden;visibility:hidden;pointer-events:none;";document.body.appendChild(f);function O(){f.style.width="0",f.style.height="0",f.style.visibility="hidden",f.style.pointerEvents="none",f.style.boxShadow="none",f.style.border="none"}function se(){f.style.width="360px",f.style.height="80vh",f.style.visibility="visible",f.style.pointerEvents="auto",f.style.boxShadow="0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,0,122,0.1)"}chrome.storage.local.get(["sidebarPosition","sidebarOpen"],o=>{const n=o.sidebarPosition,i=Math.max(0,window.innerWidth-360-16);if(f.style.left=((n==null?void 0:n.left)??i)+"px",f.style.top=((n==null?void 0:n.top)??16)+"px",!(o.sidebarOpen===!0)){O();return}chrome.runtime.sendMessage({type:"GET_SESSION"},a=>{if(!(a!=null&&a.session)){chrome.storage.local.set({sidebarOpen:!1}).catch(()=>{}),O();return}k=!0,se()})});chrome.storage.onChanged.addListener((o,n)=>{var i;n==="local"&&((i=o.sidebarOpen)==null?void 0:i.newValue)===!1&&(k=!1,O())});const ze=f.attachShadow({mode:"open"}),De=document.createElement("style");De.textContent=`
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 0;
    }

    :host > div {
        min-height: 0;
        height: 100%;
    }

    body, div, span, button, input, p, h1, h2, h3, h4 {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.5;
    }
    
    /* Container base */
    .h-full { height: 100%; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .space-x-2 > * + * { margin-left: 0.5rem; }
    .space-x-3 > * + * { margin-left: 0.75rem; }
    .space-y-1 > * + * { margin-top: 0.25rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    
    /* Colors - black + pink theme */
    .bg-\\[\\#1A1B2E\\] { background-color: #0d0d0d; }
    .bg-\\[\\#252640\\] { background-color: #1a1a1a; }
    .text-white { color: white; }
    .text-blue-400 { color: #ff007a; }
    .text-slate-400 { color: #a1a1aa; }
    .text-slate-300 { color: #d4d4d8; }
    .text-emerald-400 { color: #ff007a; }
    
    /* Borders */
    .border-b { border-bottom-width: 1px; }
    .border-white\\/10 { border-color: rgba(255, 0, 122, 0.15); }
    .border-white\\/5 { border-color: rgba(255, 0, 122, 0.08); }
    
    /* Padding & Margin */
    .p-1 { padding: 0.25rem; }
    .p-2 { padding: 0.5rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    
    /* Sizing */
    .h-14 { height: 3.5rem; }
    .w-2 { width: 0.5rem; }
    .w-3 { width: 0.75rem; }
    .h-2 { height: 0.5rem; }
    .h-3 { height: 0.75rem; }
    .shrink-0 { flex-shrink: 0; }
    .flex-1 { flex: 1 1 0%; }
    
    /* Text */
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-lg { font-size: 1.125rem; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-mono { font-family: ui-monospace, monospace; }
    .uppercase { text-transform: uppercase; }
    .tracking-tight { letter-spacing: -0.025em; }
    .tracking-wider { letter-spacing: 0.05em; }
    .leading-tight { line-height: 1.25; }
    .leading-relaxed { line-height: 1.625; }
    
    /* Effects */
    .rounded { border-radius: 0.25rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-full { border-radius: 9999px; }
    .opacity-50 { opacity: 0.5; }
    .opacity-80 { opacity: 0.8; }
    .opacity-90 { opacity: 0.9; }
    
    /* Transitions */
    .transition-colors { transition-property: color, background-color, border-color; transition-duration: 150ms; }
    .transition-all { transition-property: all; transition-duration: 150ms; }
    .duration-300 { transition-duration: 300ms; }
    
    /* Hover states */
    .hover\\:bg-white\\/10:hover { background-color: rgba(255, 255, 255, 0.1); }
    .hover\\:bg-white\\/5:hover { background-color: rgba(255, 255, 255, 0.05); }
    
    /* Cursor */
    .cursor-pointer { cursor: pointer; }
    
    /* Overflow */
    .overflow-y-auto { overflow-y: auto; }
    .overflow-hidden { overflow: hidden; }
    
    /* Position */
    .relative { position: relative; }
    .fixed { position: fixed; }
    
    /* Animations */
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    
    .bg-green-500 { background-color: #22c55e; }
    .bg-yellow-500 { background-color: #eab308; }
    .bg-red-500 { background-color: #ef4444; }
    
    /* Scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 0, 122, 0.35);
        border-radius: 3px;
    }
`;ze.appendChild(De);const Ct=Ve.createRoot(ze);let k=!1;function F(o){chrome.storage.local.set({sidebarOpen:o}).catch(()=>{})}chrome.runtime.onMessage.addListener((o,n,i)=>{try{if(o.type==="TOGGLE_SIDEBAR_TRUSTED")k=!k,k?se():O(),F(k);else if(o.type==="TOGGLE_SIDEBAR")k?(k=!1,O(),F(!1)):chrome.runtime.sendMessage({type:"GET_SESSION"},s=>{s!=null&&s.session&&(k=!0,se(),F(!0))});else if(o.type==="OPEN_SIDEBAR")chrome.runtime.sendMessage({type:"GET_SESSION"},s=>{s!=null&&s.session&&(k=!0,se(),F(!0))});else if(o.type==="CLOSE_SIDEBAR")k=!1,O(),F(!1);else{if(o.type==="GET_SIDEBAR_OPEN")return i({open:k}),!0;if(o.type==="GET_ACTIVE_SPEAKER"){const s=Et();return i({activeSpeaker:s}),!0}else o.type==="STATUS_UPDATE"&&window.location.hostname==="meet.google.com"&&(o.status==="RECORDING"?vt():(o.status==="PROGRAMMED"||o.status==="ERROR")&&(St(),wt()))}}catch(s){console.error("Content script message handler error:",s)}});Ct.render(e.jsx(Xe.StrictMode,{children:e.jsx(yt,{})}));
