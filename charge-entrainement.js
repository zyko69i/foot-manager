(function(){
"use strict";
var Q=[["vitesse","Vitesse"],["endurance","Endurance"],["force","Force"],["explosivite","Explosivité"],["coordination","Coordination / agilité"],["mobilite","Mobilité / souplesse"],["controle","Contrôle / conduite"],["dribble","Dribble"],["passes","Passes / conservation"],["finition","Finition / tir"],["defense","Défense / duel"],["tactique","Tactique / placement"],["collectif","Jeu collectif / transitions"],["mental","Mental / concentration"],["gardien","Spécifique gardien"]];
function read(k,d){try{var v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function dashboard(){
var host=document.getElementById("tbl");if(!host||document.getElementById("training-load-dashboard"))return;
var box=document.createElement("section");box.id="training-load-dashboard";box.style.cssText="margin:0 0 20px;padding:16px;border:1px solid #d6e2eb;border-radius:14px;background:#f7fbfe";
box.innerHTML='<h2 style="margin:0 0 8px">Suivi du travail par caractéristique</h2><p style="font-size:13px;color:#607080">Temps réellement saisi dans les préparations de séances, par tranches de 15 minutes.</p><label style="display:block;max-width:220px;font-size:13px">Période<select id="tl-period" style="display:block;width:100%;padding:9px;margin-top:5px"><option value="7">7 derniers jours</option><option value="30" selected>30 derniers jours</option><option value="90">90 derniers jours</option><option value="all">Tout l’historique</option></select></label><p id="tl-total" style="font-size:13px;color:#607080"></p><div id="tl-bars"></div><p id="tl-note" style="font-size:13px;color:#607080"></p>';
host.parentNode.insertBefore(box,host);
function draw(){
var period=box.querySelector("#tl-period").value,cut=new Date();cut.setHours(0,0,0,0);if(period!=="all")cut.setDate(cut.getDate()-Number(period)+1);
var plans=read("trainingPlans",{}),loads=read("trainingLoad",{}),totals={};Q.forEach(function(q){totals[q[0]]=0;});
var sessions=0;Object.keys(loads).forEach(function(id){var p=plans[id],l=loads[id];if(!p||!p.date||(period!=="all"&&new Date(p.date+"T00:00:00")<cut))return;sessions++;Q.forEach(function(q){totals[q[0]]+=Number(l[q[0]]||0);});});
var sum=Object.keys(totals).reduce(function(a,k){return a+totals[k];},0);
box.querySelector("#tl-total").textContent=sessions+" séance(s) avec répartition · "+Math.floor(sum/60)+" h "+(sum%60)+" min au total.";
box.querySelector("#tl-bars").innerHTML=Q.map(function(q){var n=totals[q[0]],pct=sum?Math.round(n/sum*100):0,color=pct>=40?"#e58b36":pct<5?"#9aa8b5":"#258bc7";return '<div style="display:grid;grid-template-columns:minmax(125px,1fr) minmax(90px,3fr) 92px;gap:8px;align-items:center;margin:9px 0;font-size:13px"><span>'+q[1]+'</span><div style="height:13px;background:#e4ebf1;border-radius:8px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+color+'"></div></div><strong style="text-align:right">'+Math.floor(n/60)+'h '+(n%60)+' · '+pct+'%</strong></div>';}).join("");
var high=Q.filter(function(q){return sum&&totals[q[0]]/sum>=.4;}).map(function(q){return q[1];}),low=Q.filter(function(q){return sum&&totals[q[0]]/sum<.05;}).map(function(q){return q[1];});
box.querySelector("#tl-note").textContent=!sum?"Pas encore de temps ventilé : renseigne les qualités dans chaque préparation de séance.":(high.length?"Part importante du volume : "+high.join(", ")+". ":"")+(low.length?"Peu représentée : "+low.join(", ")+". ":"")+"Ces repères signalent une répartition à examiner, pas un diagnostic de surentraînement.";
}
box.querySelector("#tl-period").addEventListener("change",draw);draw();
}
function addQualityForm(dlg){
if(dlg.querySelector("#tl-quality-grid"))return;
var id=dlg.dataset.trainingId;if(id==null)return;
var saved=read("trainingLoad",{})[id]||{},section=document.createElement("section");
section.style.cssText="margin:14px 0;padding:14px;background:#f2f8fc;border-radius:12px";
var html='<h3 style="margin-top:0">Temps par caractéristique travaillée</h3><p style="font-size:13px;color:#607080">Choisis le temps consacré à chaque qualité : 15 min, 30 min, 45 min, 1 h, etc. Laisse « Non travaillé » si besoin.</p><div id="tl-quality-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">';
Q.forEach(function(q){var n=Number(saved[q[0]]||0);html+='<label style="display:flex;flex-direction:column;gap:5px;font-size:13px">'+q[1]+'<select data-tl-quality="'+q[0]+'" style="padding:9px;border:1px solid #ccd6df;border-radius:8px">';[0,15,30,45,60,75,90,105,120,135,150,165,180].forEach(function(v){html+='<option value="'+v+'" '+(n===v?"selected":"")+'>'+(v===0?"Non travaillé":v<60?v+" min":(v/60)+" h")+'</option>';});html+='</select></label>';});
html+='</div><p style="font-size:12px;color:#607080">Le total réparti ne devrait pas dépasser la durée de la séance. Si la séance mélange plusieurs ateliers, ventile les minutes entre les qualités.</p>';
section.innerHTML=html;var players=dlg.querySelector(".tp-box");if(players)players.parentNode.insertBefore(section,players);else dlg.querySelector(".tp-wrap").appendChild(section);
var save=dlg.querySelector("[data-save]");if(save)save.addEventListener("click",function(){var data={};section.querySelectorAll("[data-tl-quality]").forEach(function(x){data[x.dataset.tlQuality]=Number(x.value)||0;});var all=read("trainingLoad",{}),sum=Object.keys(data).reduce(function(a,k){return a+data[k];},0);var plan=read("trainingPlans",{})[id];if(plan&&sum>Number(plan.warmMin||0)+Number(plan.mainMin||0)+Number(plan.gameMin||0)+Number(plan.coolMin||0)&&!confirm("Le temps ventilé ("+sum+" min) dépasse le déroulé détaillé. Enregistrer quand même ?"))return;all[id]=data;try{localStorage.setItem("trainingLoad",JSON.stringify(all));}catch(e){alert("Impossible d’enregistrer la répartition.");}},true);
}
var obs=new MutationObserver(function(){var d=document.querySelector("dialog.tp-dialog[open]");if(d)addQualityForm(d);});
obs.observe(document.body,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",dashboard,{once:true});else dashboard();
})();