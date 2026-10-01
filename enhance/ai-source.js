import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';
let upscaler;
self.onmessage=async({data:{buffer,width,height}})=>{
 let input,out;
 try{
  if(!new OffscreenCanvas(1,1).getContext('webgl2')&&!new OffscreenCanvas(1,1).getContext('webgl'))throw Error('AI needs WebGL on this browser. Use precise / fast instead.');
  await tf.setBackend('webgl');await tf.ready();
  self.postMessage({progress:4,label:'loading local AI model'});
  upscaler ||= new Upscaler({model:{path:new URL('models/x2/model.json',self.location.href).href,scale:2,modelType:'layers',inputRange:[0,255],outputRange:[0,255]}});
  const rgba=new Uint8ClampedArray(buffer),rgb=new Uint8Array(width*height*3);
  for(let i=0;i<width*height;i++){rgb[i*3]=rgba[i*4];rgb[i*3+1]=rgba[i*4+1];rgb[i*3+2]=rgba[i*4+2];}
  input=tf.tensor3d(rgb,[height,width,3]);
  out=await upscaler.upscale(input,{output:'tensor',patchSize:48,padding:6,awaitNextFrame:true,progress:p=>self.postMessage({progress:Math.round(8+p*88),label:'inferring detail locally'})});
  const values=await out.data(),result=new Uint8ClampedArray(width*height*16);
  for(let i=0;i<width*height*4;i++){result[i*4]=values[i*3];result[i*4+1]=values[i*3+1];result[i*4+2]=values[i*3+2];result[i*4+3]=255;}
  self.postMessage({buffer:result.buffer,width:width*2,height:height*2,done:true},[result.buffer]);
 }catch(e){self.postMessage({error:e.message||'AI could not run. Try precise / fast.'});}
 finally{input?.dispose();out?.dispose();}
};
