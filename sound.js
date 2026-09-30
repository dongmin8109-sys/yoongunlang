"use strict";

// Original procedural soundtrack and effects. Speech synthesis stays independent.
class YungeonSoundEngine {
  constructor(){
    this.context=null;this.master=null;this.musicBus=null;this.effectsBus=null;
    this.mode="menu";this.step=0;this.nextStep=0;this.timer=null;
    try{const saved=JSON.parse(localStorage.getItem("yungeonSound")||"{}");this.muted=!!saved.muted;this.bgmVolume=Number.isFinite(saved.bgmVolume)?saved.bgmVolume:.55;this.sfxVolume=Number.isFinite(saved.sfxVolume)?saved.sfxVolume:.7;}catch{this.muted=false;this.bgmVolume=.55;this.sfxVolume=.7;}
  }
  save(){try{localStorage.setItem("yungeonSound",JSON.stringify({muted:this.muted,bgmVolume:this.bgmVolume,sfxVolume:this.sfxVolume}));}catch{}}
  unlock(){
    if(!this.context){
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
      this.context=new Context();this.master=this.context.createGain();this.musicBus=this.context.createGain();this.effectsBus=this.context.createGain();
      this.musicBus.connect(this.master);this.effectsBus.connect(this.master);this.master.connect(this.context.destination);
      this.applyVolumes();this.nextStep=this.context.currentTime+.05;this.timer=setInterval(()=>this.schedule(),70);
    }
    if(this.context.state==="suspended")this.context.resume().catch(()=>{});
  }
  applyVolumes(){if(!this.context)return;const t=this.context.currentTime;this.master.gain.setTargetAtTime(this.muted?0:.9,t,.03);this.musicBus.gain.setTargetAtTime(this.bgmVolume*.38,t,.04);this.effectsBus.gain.setTargetAtTime(this.sfxVolume*.7,t,.02);}
  setMuted(value){this.muted=!!value;this.applyVolumes();this.save();}
  setBgmVolume(value){this.bgmVolume=Math.max(0,Math.min(1,Number(value)));this.applyVolumes();this.save();}
  setSfxVolume(value){this.sfxVolume=Math.max(0,Math.min(1,Number(value)));this.applyVolumes();this.save();}
  setMode(mode){if(mode!==this.mode){this.mode=mode;this.step=0;if(this.context)this.nextStep=this.context.currentTime+.08;}}
  note(frequency,start,duration,options={}){
    if(!this.context)return;const c=this.context,osc=c.createOscillator(),gain=c.createGain();
    osc.type=options.wave||"sine";osc.frequency.setValueAtTime(frequency,start);
    if(options.end)osc.frequency.exponentialRampToValueAtTime(Math.max(30,options.end),start+duration);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,options.gain||.06),start+Math.min(.025,duration*.2));gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(options.bus==="sfx"?this.effectsBus:this.musicBus);osc.start(start);osc.stop(start+duration+.015);
  }
  noise(start,duration,gainAmount=.05,highpass=800){
    if(!this.context)return;const c=this.context,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type="highpass";filter.frequency.value=highpass;gain.gain.setValueAtTime(gainAmount,start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter);filter.connect(gain);gain.connect(this.effectsBus);source.start(start);source.stop(start+duration+.01);
  }
  schedule(){
    if(!this.context||this.context.state!=="running")return;
    const c=this.context,menu=this.mode!=="battle",bpm=menu?96:138,stepTime=60/bpm/4;
    while(this.nextStep<c.currentTime+.22){this.musicStep(this.step,this.nextStep,stepTime,menu);this.step=(this.step+1)%64;this.nextStep+=stepTime;}
  }
  musicStep(step,time,stepTime,menu){
    const bar=Math.floor(step/16),beat=step%16;
    if(menu){
      const chords=[[261.6,329.6,392],[220,261.6,329.6],[174.6,220,349.2],[196,246.9,392]];
      if(beat===0)for(const freq of chords[bar])this.note(freq,time,stepTime*14,{wave:"sine",gain:.026});
      const pattern=[523.3,0,659.3,0,783.99,0,659.3,0,587.3,0,523.3,0,440,0,392,0];
      if(pattern[beat]){this.note(pattern[beat]*(bar===2?.88:1),time,stepTime*1.65,{wave:"triangle",gain:.073});this.note(pattern[beat]*.5,time,stepTime*1.4,{wave:"sine",gain:.025});}
      if(beat%4===0)this.note(chords[bar][0]/2,time,stepTime*3,{wave:"triangle",gain:.045});
    }else{
      const roots=[146.8,116.5,130.8,110];
      if(beat%4===0){this.note(roots[bar]/2,time,stepTime*3.2,{wave:"sawtooth",gain:.085});this.note(75,time,stepTime*1.3,{wave:"sine",gain:.11,end:37});}
      if(beat===4||beat===12){this.note(205,time,stepTime*.65,{wave:"triangle",gain:.06,end:110});this.note(480,time,stepTime*.43,{wave:"square",gain:.018,end:140});}
      if(beat%2===0)this.note(3900,time,stepTime*.23,{wave:"triangle",gain:.018,end:2200});
      const lead=[0,293.7,0,349.2,440,0,349.2,0,523.3,0,440,349.2,0,293.7,0,261.6];
      if(lead[beat])this.note(lead[beat]*(bar===1?.9:1),time,stepTime*1.3,{wave:"square",gain:.027});
      if(beat===0||beat===8)for(const ratio of[1,1.2,1.5])this.note(roots[bar]*ratio,time,stepTime*7,{wave:"sine",gain:.018});
    }
  }
  play(name){
    this.unlock();if(!this.context||this.muted||this.sfxVolume<=0)return;const t=this.context.currentTime+.006;
    const n=(f,d,w="triangle",g=.13,end)=>this.note(f,t,d,{wave:w,gain:g,end,bus:"sfx"});
    switch(name){
      case "shoot":n(560,.12,"square",.052,230);n(950,.07,"triangle",.09,510);break;
      case "hit":n(175,.18,"sawtooth",.15,72);this.noise(t,.12,.13,450);break;
      case "ko":n(390,.43,"sawtooth",.16,80);this.noise(t,.34,.18,350);this.note(110,t+.19,.3,{wave:"sine",gain:.14,end:45,bus:"sfx"});break;
      case "correct":for(const [i,f] of[523,659,784,1046].entries())this.note(f,t+i*.09,.25,{wave:"triangle",gain:.13,bus:"sfx"});break;
      case "wrong":n(340,.33,"square",.1,150);this.note(190,t+.12,.24,{wave:"triangle",gain:.09,end:95,bus:"sfx"});break;
      case "item":for(const [i,f] of[784,1046,1318].entries())this.note(f,t+i*.07,.22,{wave:"sine",gain:.12,bus:"sfx"});break;
      case "end":for(const [i,f] of[392,523,659,784,1046].entries())this.note(f,t+i*.13,.42,{wave:"triangle",gain:.14,bus:"sfx"});break;
      case "skill":n(440,.2,"triangle",.1,880);this.noise(t,.08,.05,1500);break;
      case "super":n(260,.5,"sawtooth",.12,740);this.note(1046,t+.18,.34,{wave:"triangle",gain:.1,bus:"sfx"});break;
      case "jump":n(210,.37,"triangle",.11,870);break;
      case "land":n(150,.42,"sawtooth",.16,46);this.noise(t,.26,.13,420);break;
      case "respawn":for(const [i,f] of[392,523,784].entries())this.note(f,t+i*.08,.24,{wave:"sine",gain:.1,bus:"sfx"});break;
    }
  }
}

window.YungeonSound = new YungeonSoundEngine();
