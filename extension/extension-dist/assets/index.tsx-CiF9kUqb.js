import{c as C,r as c,j as e,T as R,B as te,a as w,b as E,d as ne,R as X,e as S,M as Te,A as Re,N as A,f as Ae,g as _e}from"./theme-UeVto8tc.js";import{a as he}from"./auth-wm7ZfynG.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Le=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],ze=C("check",Le);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const De=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]],Oe=C("circle-question-mark",De);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Be=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],Pe=C("copy",Be);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $e=[["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M17 20v2",key:"1rnc9c"}],["path",{d:"M17 2v2",key:"11trls"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M2 17h2",key:"7oei6x"}],["path",{d:"M2 7h2",key:"asdhe0"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"M20 17h2",key:"1fpfkl"}],["path",{d:"M20 7h2",key:"1o8tra"}],["path",{d:"M7 20v2",key:"4gnj0m"}],["path",{d:"M7 2v2",key:"1i4yhu"}],["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"8",y:"8",width:"8",height:"8",rx:"1",key:"z9xiuo"}]],ge=C("cpu",$e);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ge=[["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}],["circle",{cx:"9",cy:"5",r:"1",key:"hp0tcf"}],["circle",{cx:"9",cy:"19",r:"1",key:"fkjjf6"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["circle",{cx:"15",cy:"19",r:"1",key:"f4zoj3"}]],me=C("grip-vertical",Ge);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ue=[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}]],He=C("message-circle",Ue);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const We=[["path",{d:"M5 12h14",key:"1ays0h"}]],Fe=C("minus",We);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ye=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],qe=C("triangle-alert",Ye);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ve=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],Xe=C("x",Ve),Qe=4,Ke=18,K="#22c55e",_="#3b82f6";function Je({text:n,animate:t,cursorColor:s}){const[i,r]=c.useState(t?0:n.length),d=c.useRef(n);c.useEffect(()=>{if(!t){r(n.length);return}const g=d.current;d.current=n,n.startsWith(g)?r(k=>Math.min(k,g.length)):r(0)},[n,t]),c.useEffect(()=>{if(!t||i>=n.length)return;const g=setTimeout(()=>r(k=>k+1),Ke);return()=>clearTimeout(g)},[i,n,t]);const h=t&&i<n.length;return e.jsxs(e.Fragment,{children:[e.jsx("span",{children:n.slice(0,i)}),h&&e.jsx("span",{style:{display:"inline-block",width:2,height:13,backgroundColor:s,marginLeft:1,verticalAlign:"text-bottom",animation:"cursorBlink 0.6s step-end infinite"}})]})}function ye({text:n}){const[t,s]=c.useState(!1),i=()=>{navigator.clipboard.writeText(n).then(()=>{s(!0),setTimeout(()=>s(!1),2e3)}).catch(()=>{})};return e.jsxs("button",{onClick:i,title:"Copiar",style:{padding:4,background:"transparent",border:"none",color:t?K:S,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:10,flexShrink:0},children:[t?e.jsx(ze,{size:12}):e.jsx(Pe,{size:12}),t?"Copiado":"Copiar"]})}var ke;const xe=typeof chrome<"u"&&((ke=chrome.runtime)!=null&&ke.getURL)?chrome.runtime.getURL("logo.svg"):"",Q=360,Ze="80vh",be=48,ve=56;function et(n){const t=n.target.getRootNode();return t&&"host"in t?t.host:document.getElementById("sales-copilot-root")}function P(){return document.getElementById("sales-copilot-root")}function tt(){const[n,t]=c.useState(null),[s,i]=c.useState(!0),[r,d]=c.useState([]),[h,g]=c.useState([]),[k,z]=c.useState(!1),[Z,W]=c.useState(""),[re,ae]=c.useState(null),[F,le]=c.useState(!1),[ut,ce]=c.useState(null),[N,de]=c.useState(!1),I=c.useRef({startX:0,startY:0,startLeft:0,startTop:0,panelW:Q,panelH:300}),ue=c.useRef(null);c.useEffect(()=>{const o=P();o&&chrome.storage.local.get(["sidebarPosition","sidebarMinimized","sidebarOpen"],a=>{const l=a.sidebarPosition,b=Math.max(0,window.innerWidth-Q-16);o.style.left=((l==null?void 0:l.left)??b)+"px",o.style.top=((l==null?void 0:l.top)??16)+"px";const u=a.sidebarMinimized??!1,v=a.sidebarOpen===!0;de(u),v||(o.style.width="0",o.style.height="0",o.style.visibility="hidden",o.style.pointerEvents="none")})},[]),c.useEffect(()=>{const o=P();o&&(o.style.width=N?be+"px":Q+"px",o.style.height=N?ve+"px":Ze,chrome.storage.local.set({sidebarMinimized:N}))},[N]),c.useEffect(()=>{if(s||n)return;chrome.storage.local.set({sidebarOpen:!1}).catch(()=>{});const o=P();o&&(o.style.width="0",o.style.height="0",o.style.visibility="hidden",o.style.pointerEvents="none")},[s,n]);const pe=o=>{if(o.target.closest("button"))return;const a=et(o);if(!a)return;o.preventDefault();const l=N?be:Q,b=a.style.left||"",u=a.style.top||"",v=b?parseFloat(b):window.innerWidth-l-16,f=u?parseFloat(u):16,y=Number.isNaN(v)?0:Math.max(0,v),D=Number.isNaN(f)?0:Math.max(0,f);I.current={startX:o.clientX,startY:o.clientY,startLeft:y,startTop:D,panelW:l,panelH:N?ve:200};const Y=m=>{const j=m.clientX-I.current.startX,O=m.clientY-I.current.startY,T=P();if(T){const M=window.innerWidth-I.current.panelW-8,B=window.innerHeight-I.current.panelH-8,V=Math.max(0,Math.min(M,I.current.startLeft+j)),Ie=Math.max(0,Math.min(B,I.current.startTop+O));T.style.left=V+"px",T.style.top=Ie+"px"}},q=()=>{document.removeEventListener("mousemove",Y),document.removeEventListener("mouseup",q);const m=P();m&&chrome.storage.local.set({sidebarPosition:{left:parseFloat(m.style.left||"0")||0,top:parseFloat(m.style.top||"0")||0}})};document.addEventListener("mousemove",Y),document.addEventListener("mouseup",q)},fe=()=>de(o=>!o);c.useEffect(()=>{we()},[]);const we=async()=>{const o=await he.getSession();t(o),i(!1)},Ne=async()=>{await he.logout(),t(null),le(!1)};c.useEffect(()=>{var o;(o=ue.current)==null||o.scrollIntoView({behavior:"smooth"})},[r,h]),c.useEffect(()=>{const o=a=>{var l,b,u,v;if(a.type==="TRANSCRIPT_RESULT"){const{text:f,isFinal:y,timestamp:D,speaker:Y,role:q}=a.data||{};if(!f)return;const m={text:f,speaker:Y||"unknown",role:q||"unknown",isFinal:y??!0,timestamp:D||Date.now()};d(j=>{if(!y){const M=j.length-1,B=M>=0?j[M]:null;if(B&&!B.isFinal&&B.role===m.role){const V=[...j];return V[M]=m,V}return[...j,m]}const O=j.length-1,T=O>=0?j[O]:null;if(T&&!T.isFinal&&T.role===m.role){const M=[...j];return M[O]=m,M}return[...j,m]})}else if(a.type==="STATUS_UPDATE")le(a.status==="RECORDING"),a.status==="RECORDING"&&typeof a.micAvailable=="boolean"&&ce(a.micAvailable),a.status!=="RECORDING"&&ce(null),a.status==="PERMISSION_REQUIRED"&&alert("Permissão necessária. Clique no ícone da extensão na barra do navegador para autorizar a captura da aba.");else if(a.type==="MANAGER_WHISPER")ae({content:a.data.content,urgency:a.data.urgency,timestamp:a.data.timestamp});else if(a.type==="COACH_THINKING")z(!0),W("");else if(a.type==="COACH_TOKEN")W(f=>{var y;return f+(((y=a.data)==null?void 0:y.token)||"")});else if(a.type==="COACH_IDLE"||a.type==="COACH_DONE")z(!1),W("");else if(a.type==="COACHING_MESSAGE"){z(!1),W("");const f=a.data,y={phase:((l=f.metadata)==null?void 0:l.phase)||"S",tip:f.content||"",objection:((b=f.metadata)==null?void 0:b.objection)||null,suggestedResponse:((u=f.metadata)==null?void 0:u.suggested_response)||null,suggestedQuestion:((v=f.metadata)==null?void 0:v.suggested_question)||null,urgency:f.urgency||"medium",timestamp:Date.now()};g(D=>[y,...D].slice(0,Qe))}};return chrome.runtime.onMessage.addListener(o),()=>chrome.runtime.onMessage.removeListener(o)},[]);const ee={width:"100%",minHeight:0,flex:1,display:"flex",flexDirection:"column",backgroundColor:te,fontFamily:"system-ui, -apple-system, sans-serif",color:R};return s?e.jsx("div",{style:{...ee,height:"100%",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("span",{style:{color:w,fontSize:13},children:"Carregando..."})}):n?N?e.jsx("div",{onMouseDown:pe,style:{width:"100%",height:"100%",backgroundColor:te,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui, -apple-system, sans-serif",borderRight:`1px solid ${E}`,cursor:"move",userSelect:"none"},children:e.jsx("button",{onClick:fe,title:"Expandir",style:{width:32,height:32,borderRadius:X,border:`1px solid ${E}`,background:ne,color:w,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(me,{size:16,style:{transform:"rotate(-90deg)"}})})}):e.jsxs("div",{style:{...ee,height:"100%"},children:[e.jsxs("div",{onMouseDown:pe,style:{padding:"8px 12px",borderBottom:`1px solid ${E}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"move",userSelect:"none",flexShrink:0},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx(me,{size:14,style:{color:S}}),xe?e.jsx("img",{src:xe,alt:"HelpSeller",style:{height:18,width:"auto"}}):e.jsx(Te,{size:14,style:{color:F?Re:S}}),e.jsx("div",{style:{fontSize:10,fontWeight:600,color:w},children:F?"Ao Vivo":"Parado"})]}),e.jsxs("div",{style:{display:"flex",gap:4,alignItems:"center"},onClick:o=>o.stopPropagation(),children:[e.jsx("button",{onClick:fe,title:"Minimizar",style:{padding:4,background:"transparent",border:`1px solid ${E}`,borderRadius:X,color:w,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(Fe,{size:12})}),e.jsx("button",{onClick:Ne,style:{padding:4,fontSize:10,background:"transparent",border:`1px solid ${E}`,borderRadius:X,color:w,cursor:"pointer"},children:"Sair"})]})]}),re&&e.jsxs("div",{style:{padding:"8px 12px",background:"#1a1a2e",borderBottom:`1px solid ${E}`,flexShrink:0},children:[e.jsxs("div",{style:{fontSize:10,fontWeight:600,marginBottom:4,color:_,textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsx("span",{children:"Gestor diz:"}),e.jsx("button",{onClick:()=>ae(null),style:{background:"none",border:"none",color:S,cursor:"pointer",padding:0,display:"flex"},children:e.jsx(Xe,{size:12})})]}),e.jsx("div",{style:{fontSize:12,lineHeight:1.5,color:R},children:re.content})]}),k&&e.jsxs("div",{style:{padding:"8px 12px",borderBottom:`1px solid ${E}`,flexShrink:0,borderLeft:`3px solid ${A}`,background:"rgba(255,0,122,0.04)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:Z?4:0},children:[e.jsx(ge,{size:12,style:{color:A,animation:"spin 1.5s linear infinite"}}),e.jsx("span",{style:{fontSize:10,color:S,fontWeight:600},children:"Coach analisando..."})]}),Z&&(()=>{try{const o=JSON.parse(Z+'"}'),a=o.suggested_response||o.tip||"";if(a)return e.jsxs("div",{style:{fontSize:12,color:w,lineHeight:1.4,fontStyle:"italic"},children:['"',a,'"',e.jsx("span",{style:{display:"inline-block",width:2,height:12,backgroundColor:A,marginLeft:2,verticalAlign:"text-bottom",animation:"cursorBlink 0.6s step-end infinite"}})]})}catch{}return null})()]}),h.length>0&&e.jsx("div",{style:{flexShrink:0,maxHeight:"50%",overflowY:"auto",borderBottom:`1px solid ${E}`},children:h.map((o,a)=>{const l=a===0,b=l?1:.45;return e.jsxs("div",{style:{opacity:b,borderBottom:a<h.length-1?`1px solid ${E}`:"none",animation:l?"coachPop 0.4s ease":"none"},children:[o.objection&&e.jsx("div",{style:{padding:"8px 12px",background:"rgba(239,68,68,0.12)",borderBottom:"1px solid rgba(239,68,68,0.3)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx(qe,{size:12,style:{color:"#ef4444"}}),e.jsxs("span",{style:{fontSize:11,fontWeight:700,color:"#ef4444",textTransform:"uppercase"},children:["Objeção: ",o.objection]})]})}),o.suggestedResponse&&e.jsxs("div",{style:{padding:"10px 12px",background:l?"rgba(34,197,94,0.10)":"transparent",borderLeft:l?`3px solid ${K}`:"none"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx(He,{size:13,style:{color:K,animation:l?"pulse 1.5s ease-in-out 3":"none"}}),e.jsx("span",{style:{fontSize:11,fontWeight:800,color:K,textTransform:"uppercase",letterSpacing:"0.04em"},children:"Diga Agora"})]}),l&&e.jsx(ye,{text:o.suggestedResponse})]}),e.jsxs("div",{style:{fontSize:l?14:11,fontWeight:600,lineHeight:1.5,color:R},children:['"',o.suggestedResponse,'"']})]}),o.suggestedQuestion&&e.jsxs("div",{style:{padding:"8px 12px",background:l?"rgba(59,130,246,0.08)":"transparent",borderLeft:l?`3px solid ${_}`:"none"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx(Oe,{size:12,style:{color:_}}),e.jsx("span",{style:{fontSize:10,fontWeight:700,color:_,textTransform:"uppercase"},children:"Pergunte"})]}),l&&e.jsx(ye,{text:o.suggestedQuestion})]}),e.jsxs("div",{style:{fontSize:l?13:11,fontWeight:500,lineHeight:1.4,color:R},children:['"',o.suggestedQuestion,'"']})]}),!o.suggestedResponse&&!o.suggestedQuestion&&!o.objection&&e.jsxs("div",{style:{padding:"6px 12px",background:l?ne:"transparent"},children:[e.jsx("div",{style:{fontSize:10,fontWeight:600,marginBottom:3,color:A,textTransform:"uppercase"},children:"Dica"}),e.jsx("div",{style:{fontSize:11,lineHeight:1.4,color:w},children:o.tip.split(/(\*\*.*?\*\*)/).map((u,v)=>u.startsWith("**")&&u.endsWith("**")?e.jsx("strong",{style:{color:R,fontWeight:600},children:u.slice(2,-2)},v):u)})]})]},`cf-${o.timestamp}-${a}`)})}),e.jsxs("div",{style:{flex:"1 1 0",minHeight:0,overflowY:"auto",padding:"8px 10px",display:"flex",flexDirection:"column",gap:6,backgroundColor:te},children:[e.jsxs("div",{style:{fontSize:10,fontWeight:600,marginBottom:2,color:S,textTransform:"uppercase",letterSpacing:"0.05em",flexShrink:0,display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:_},children:"Cliente"}),e.jsx("span",{children:"Transcrição"}),e.jsx("span",{style:{color:A},children:"Você"})]}),r.length===0?e.jsxs("div",{style:{fontSize:12,color:S,display:"flex",alignItems:"center",justifyContent:"center",gap:6,flex:1},children:[e.jsx("span",{children:"Aguardando áudio"}),e.jsxs("span",{style:{display:"inline-flex",gap:3},children:[e.jsx("span",{style:{width:4,height:4,borderRadius:"50%",backgroundColor:S,animation:"aiPulse 1.4s infinite 0s"}}),e.jsx("span",{style:{width:4,height:4,borderRadius:"50%",backgroundColor:S,animation:"aiPulse 1.4s infinite 0.3s"}}),e.jsx("span",{style:{width:4,height:4,borderRadius:"50%",backgroundColor:S,animation:"aiPulse 1.4s infinite 0.6s"}})]})]}):r.map((o,a)=>{const l=a===r.length-1,b=l,u=o.role==="lead",v=u?"rgba(59,130,246,0.12)":"rgba(255,0,122,0.10)",f=u?"rgba(59,130,246,0.25)":"rgba(255,0,122,0.25)",y=u?_:A;return e.jsx("div",{style:{display:"flex",justifyContent:u?"flex-start":"flex-end",animation:l&&o.isFinal?"slideIn 0.2s ease":"none"},children:e.jsxs("div",{style:{maxWidth:"85%",padding:"5px 10px",borderRadius:u?"10px 10px 10px 2px":"10px 10px 2px 10px",backgroundColor:v,border:`1px solid ${f}`,opacity:o.isFinal?1:.7,transition:"opacity 0.2s ease"},children:[e.jsx("div",{style:{fontSize:8,fontWeight:700,color:y,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:1},children:u?"CLIENTE":"VOCÊ"}),e.jsx("div",{style:{fontSize:11,lineHeight:1.45,color:R},children:e.jsx(Je,{text:o.text,animate:b,cursorColor:y})})]})},`${o.timestamp}-${a}`)}),e.jsx("div",{ref:ue})]}),e.jsx("div",{style:{padding:"6px 12px",borderTop:`1px solid ${E}`,flexShrink:0},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",backgroundColor:ne,border:`1px solid ${E}`,borderRadius:X,fontSize:10,color:S},children:[e.jsx(ge,{size:10,style:F?{animation:"spin 2s linear infinite",color:A}:{}}),F?k?"Analisando...":"Escutando ao vivo":"Aguardando gravação"]})}),e.jsx("style",{children:`
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
            `})]}):e.jsxs("div",{style:{...ee,height:"100%",padding:24,justifyContent:"center",alignItems:"center",textAlign:"center"},children:[e.jsx("p",{style:{fontSize:13,color:w,marginBottom:8},children:"Este painel só funciona quando você está logado."}),e.jsx("p",{style:{fontSize:14,fontWeight:600,color:R},children:"Faça login no ícone da extensão na barra de ferramentas do navegador."})]})}const nt=[/microfone/i,/câmera/i,/camera/i,/desativar/i,/ativar/i,/ctrl\s*\+/i,/alt\s*\+/i,/devices?$/i,/configurações/i,/settings/i,/mute/i,/unmute/i,/turn\s+(on|off)/i,/apresentar/i,/present/i,/chat/i,/meet\.google/i,/participants/i,/participantes/i,/legendas/i,/captions/i,/mais\s+opções/i,/more\s+options/i,/sair/i,/leave/i,/^\d+$/,/^[a-z]$/i];function Ee(n){const t=n.trim();if(t.length<2||t.length>50)return!1;for(const s of nt)if(s.test(t))return!1;if(t.length>10){const s=Math.floor(t.length/2),i=t.substring(0,s).toLowerCase().trim(),r=t.substring(s).toLowerCase().trim();if(i===r)return!1}return!0}function ie(n){let t=n.trim();t=t.replace(/devices$/i,"").trim();for(let s=Math.floor(t.length/2)-2;s<=Math.ceil(t.length/2)+2;s++)if(s>0&&s<t.length){const i=t.substring(0,s).trim(),r=t.substring(s).trim();if(i.toLowerCase()===r.toLowerCase())return i}return t}const ot=["[data-self-name]",".zWGUib",".adnwBd",".YTbUzc",".cS7aqe"];function se(){let n="";const t=new Set;for(const i of ot)try{document.querySelectorAll(i).forEach(r=>{var g;let d="";const h=r;if(h.hasAttribute("data-self-name"))d=(h.getAttribute("data-self-name")||"").trim(),d&&(n=d);else{const k=Array.from(r.childNodes).filter(z=>z.nodeType===Node.TEXT_NODE);k.length>0?d=(k[0].textContent||"").trim():d=((g=(h.innerText||"").split(`
`)[0])==null?void 0:g.trim())||""}d&&Ee(d)&&t.add(d)})}catch{}const s=[];if(t.forEach(i=>{i!==n&&!s.includes(i)&&s.push(i)}),s.length===0){const r=document.title.replace(/\s*[-–]\s*Google Meet.*$/i,"").trim();r&&r!=="Meeting"&&Ee(r)&&s.push(r)}return{selfName:n,otherNames:s}}function it(){const{selfName:n,otherNames:t}=se(),s=t.filter(i=>i!==n).map(ie).filter(i=>i.length>1);return s.length===0?null:s.join(", ")}function st(){const{selfName:n,otherNames:t}=se(),s=t.filter(r=>r!==n).map(ie).filter(r=>r.length>1),i=s.length>0?s.join(", "):null;(n||i||s.length>0)&&chrome.runtime.sendMessage({type:"PARTICIPANT_INFO",leadName:i||"Lead",selfName:n||"",allParticipants:s}).catch(()=>{})}let G=null,U=null;function Se(n){const{selfName:t,otherNames:s}=se(),i=s.filter(g=>g!==t).map(ie).filter(g=>g.length>1),r=i.length>0?i.join(", "):null,d=r&&r!==n.leadName,h=t&&t!==n.selfName;(d||h)&&(d&&(n.leadName=r||""),h&&(n.selfName=t||""),chrome.runtime.sendMessage({type:"PARTICIPANT_INFO",leadName:r||"Lead",selfName:t||"",allParticipants:i}).catch(()=>{}))}function je(){if(G)return;const n={leadName:"",selfName:""};function t(){Se(n)}t(),G=setInterval(t,2e3);let s=null;U=new MutationObserver(()=>{s||(s=setTimeout(()=>{s=null,Se(n)},2e3))}),U.observe(document.body,{childList:!0,subtree:!0})}function rt(){G&&(clearInterval(G),G=null),U&&(U.disconnect(),U=null)}function at(){const n=['[jsname="RKGaOc"]','[jsname="EaZ7Me"]','div[role="region"]'];for(const i of n){const r=document.querySelector(i);if(r){const d=r.querySelector('[aria-label*="microphone" i], [aria-label*="microfone" i], [data-tooltip*="microphone" i], [data-tooltip*="microfone" i]');if(d)return oe(d,`${i} > mic button`)}}const t=document.querySelector('button[jsname="BOHaEe"]')||document.querySelector('div[jsname="BOHaEe"]');if(t)return oe(t,"jsname BOHaEe");const s=document.querySelectorAll('[aria-label*="microphone" i], [aria-label*="microfone" i]');for(const i of s)if(!(i.closest('[role="listitem"], [role="list"], [jsname="jrQDbd"], [data-participant-id]')||i.getAttribute("role")!=="button"&&i.tagName.toLowerCase()!=="button"))return oe(i,"aria-label mic button");return console.log("🎤 [MIC DEBUG] No mic button found, assuming unmuted"),!1}function oe(n,t){const s=n.getAttribute("data-is-muted");if(s==="true")return console.log(`🎤 [MIC DEBUG] MUTED via data-is-muted on ${t}`),!0;if(s==="false")return console.log(`🎤 [MIC DEBUG] UNMUTED via data-is-muted on ${t}`),!1;const i=n.getAttribute("aria-pressed");if(i==="true")return console.log(`🎤 [MIC DEBUG] MUTED via aria-pressed on ${t}`),!0;if(i==="false")return console.log(`🎤 [MIC DEBUG] UNMUTED via aria-pressed on ${t}`),!1;const r=(n.getAttribute("aria-label")||n.getAttribute("data-tooltip")||"").toLowerCase();return r.includes("ativar")||r.includes("turn on")||r.includes("unmute")||r.includes("ligar")?(console.log(`🎤 [MIC DEBUG] MUTED via label "${r}" on ${t}`),!0):r.includes("desativar")||r.includes("turn off")||r.includes("mute")||r.includes("desligar")?(console.log(`🎤 [MIC DEBUG] UNMUTED via label "${r}" on ${t}`),!1):(console.log(`🎤 [MIC DEBUG] Could not determine state for ${t}, assuming unmuted`),!1)}let H=null;function lt(){if(H)return;let n=null;console.log("🎤 [MIC MONITOR] Started mic state monitoring"),H=setInterval(()=>{const t=at();t!==n&&(n=t,console.log(`🎤 [MIC MONITOR] State changed: ${t?"MUTED":"UNMUTED"}`),chrome.runtime.sendMessage({type:"MIC_STATE",muted:t}).catch(()=>{}))},1e3)}function ct(){H&&(clearInterval(H),H=null)}if(window.location.hostname==="meet.google.com"){je(),lt(),document.readyState!=="complete"&&window.addEventListener("load",()=>je());const n=()=>{chrome.runtime.sendMessage({type:"TRY_END_CALL"}).catch(()=>{})};window.addEventListener("beforeunload",n),window.addEventListener("pagehide",n)}const p=document.createElement("div");p.id="sales-copilot-root";p.style.cssText="position:fixed;width:0;height:0;z-index:2147483647;transition: width 0.2s ease, height 0.2s ease;border-radius:12px;overflow:hidden;visibility:hidden;pointer-events:none;";document.body.appendChild(p);function L(){p.style.width="0",p.style.height="0",p.style.visibility="hidden",p.style.pointerEvents="none",p.style.boxShadow="none",p.style.border="none"}function J(){p.style.width="360px",p.style.height="80vh",p.style.visibility="visible",p.style.pointerEvents="auto",p.style.boxShadow="0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,0,122,0.1)"}chrome.storage.local.get(["sidebarPosition","sidebarOpen"],n=>{const t=n.sidebarPosition,s=Math.max(0,window.innerWidth-360-16);if(p.style.left=((t==null?void 0:t.left)??s)+"px",p.style.top=((t==null?void 0:t.top)??16)+"px",!(n.sidebarOpen===!0)){L();return}chrome.runtime.sendMessage({type:"GET_SESSION"},r=>{if(!(r!=null&&r.session)){chrome.storage.local.set({sidebarOpen:!1}).catch(()=>{}),L();return}x=!0,J()})});chrome.storage.onChanged.addListener((n,t)=>{var s;t==="local"&&((s=n.sidebarOpen)==null?void 0:s.newValue)===!1&&(x=!1,L())});const Ce=p.attachShadow({mode:"open"}),Me=document.createElement("style");Me.textContent=`
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
`;Ce.appendChild(Me);const dt=Ae.createRoot(Ce);let x=!1;function $(n){chrome.storage.local.set({sidebarOpen:n}).catch(()=>{})}chrome.runtime.onMessage.addListener((n,t,s)=>{try{if(n.type==="TOGGLE_SIDEBAR_TRUSTED")x=!x,x?J():L(),$(x);else if(n.type==="TOGGLE_SIDEBAR")x?(x=!1,L(),$(!1)):chrome.runtime.sendMessage({type:"GET_SESSION"},i=>{i!=null&&i.session&&(x=!0,J(),$(!0))});else if(n.type==="OPEN_SIDEBAR")chrome.runtime.sendMessage({type:"GET_SESSION"},i=>{i!=null&&i.session&&(x=!0,J(),$(!0))});else if(n.type==="CLOSE_SIDEBAR")x=!1,L(),$(!1);else{if(n.type==="GET_SIDEBAR_OPEN")return s({open:x}),!0;if(n.type==="GET_ACTIVE_SPEAKER"){const i=it();return s({activeSpeaker:i}),!0}else n.type==="STATUS_UPDATE"&&window.location.hostname==="meet.google.com"&&(n.status==="RECORDING"?st():(n.status==="PROGRAMMED"||n.status==="ERROR")&&(rt(),ct()))}}catch(i){console.error("Content script message handler error:",i)}});dt.render(e.jsx(_e.StrictMode,{children:e.jsx(tt,{})}));
