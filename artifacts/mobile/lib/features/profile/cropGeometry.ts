// Convert the square preview into source pixels; never crop outside the image.
export function cropRectangle(width:number,height:number,viewport:number,zoom:number,x:number,y:number){
 const scale=Math.max(viewport/width,viewport/height)*Math.max(1,zoom);
 const side=Math.max(1,Math.min(width,height,Math.floor(viewport/scale)));
 return {originX:Math.max(0,Math.min(width-side,Math.round((width-side)/2-x/scale))),originY:Math.max(0,Math.min(height-side,Math.round((height-side)/2-y/scale))),width:side,height:side};
}
