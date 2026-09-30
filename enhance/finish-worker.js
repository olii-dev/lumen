/* Luminance-guided 3x3 denoising, restrained percentile tone mapping and
   thresholded, halo-limited luminance sharpening. No neural inference here. */
self.onmessage = ({data:{buffer,width:w,height:h,settings:s}}) => {
 try {
  const a=new Uint8ClampedArray(buffer), n=w*h, l=new Float32Array(n), clean=new Float32Array(n), hist=new Uint32Array(256);
  for(let i=0;i<n;i++){const j=i*4;l[i]=.2126*a[j]+.7152*a[j+1]+.0722*a[j+2];if(a[j+3]>128)hist[Math.round(l[i])]++;}
  const sigma=3+s.noise*.35, weights=new Float32Array(256);for(let i=0;i<256;i++)weights[i]=Math.exp(-i*i/(2*sigma*sigma));
  self.postMessage({progress:12,label:'cleaning noise'});
  const mix=s.noise/100*.85, rgb=new Uint8ClampedArray(a);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let sum=l[i]*4,total=4,rs=a[i*4]*4,gs=a[i*4+1]*4,bs=a[i*4+2]*4;
   if(mix&&a[i*4+3]>0){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const yy=y+dy,xx=x+dx;if(xx<0||xx>=w||yy<0||yy>=h)continue;const k=yy*w+xx;if(a[k*4+3]===0)continue;const wt=weights[Math.min(255,Math.round(Math.abs(l[k]-l[i])))]*(dx&&dy?.7:1);sum+=l[k]*wt;rs+=a[k*4]*wt;gs+=a[k*4+1]*wt;bs+=a[k*4+2]*wt;total+=wt;}}
   clean[i]=l[i]*(1-mix)+sum/total*mix;rgb[i*4]=a[i*4]*(1-mix)+rs/total*mix;rgb[i*4+1]=a[i*4+1]*(1-mix)+gs/total*mix;rgb[i*4+2]=a[i*4+2]*(1-mix)+bs/total*mix;
  }
  let count=hist.reduce((v,x)=>v+x,0), cum=0,low=0,high=255;for(let i=0;i<256;i++){cum+=hist[i];if(cum<count*.01)low=i;if(cum<count*.99)high=i;}
  // Only a small bounded stretch. Flat images stay flat, not posterised.
  const stretch=high-low>60?Math.min(1.18,255/(high-low)):1, lift=s.light/100;
  self.postMessage({progress:55,label:'balancing light & detail'});
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,j=i*4,c=clean[i];let blur=0,lo=c,hi=c;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=Math.min(h-1,Math.max(0,y+dy))*w+Math.min(w-1,Math.max(0,x+dx));const v=clean[k];blur+=v*(dx===0?2:1)*(dy===0?2:1);lo=Math.min(lo,v);hi=Math.max(hi,v);}
   blur/=16;const d=c-blur,threshold=1+s.noise*.025,detail=Math.abs(d)>threshold?d*s.detail/100*1.5:0;
   let out=Math.max(lo-3,Math.min(hi+3,c+Math.max(-16,Math.min(16,detail))));
   const normal=out/255;out+=lift*((out-low)*stretch-out)*.55+lift*18*(1-normal)*(1-normal)*Math.min(1,out/20);
   const delta=out-c;let r=rgb[j]+delta,g=rgb[j+1]+delta,b=rgb[j+2]+delta;
   const mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=(mx-mn)/Math.max(1,mx),vibrance=s.colour/100*.35*(1-sat);
   a[j]=r+(r-out)*vibrance;a[j+1]=g+(g-out)*vibrance;a[j+2]=b+(b-out)*vibrance;
  }
  self.postMessage({buffer:a.buffer,width:w,height:h,done:true},[a.buffer]);
 }catch(e){self.postMessage({error:e.message||'Image processing failed.'});}
};
