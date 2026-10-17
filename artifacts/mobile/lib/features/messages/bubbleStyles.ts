export const BUBBLE_VARIANTS=['classic','minimal','glass','gradient','neon','elegant','compact','magenta','glass_graphite','glass_blue'] as const;
export type BubbleStyleVariant=typeof BUBBLE_VARIANTS[number];
export const BUBBLE_VARIANT_NAMES:Record<BubbleStyleVariant,string>={classic:'Clásica',minimal:'Minimalista',glass:'Cristal',gradient:'Degradado',neon:'Borde suave',elegant:'Elegante',compact:'Compacta',magenta:'Magenta',glass_graphite:'Cristal grafito',glass_blue:'Cristal azul'};
export function normalizeBubbleStyle(value:unknown):BubbleStyleVariant{return BUBBLE_VARIANTS.includes(value as BubbleStyleVariant)?value as BubbleStyleVariant:'classic';}
export const SOLANGE_ACCOUNT_ID='e249faf0-8987-4e98-bd24-57cc71501ffd';
export function composerPlaceholder(userId?:string){return userId===SOLANGE_ACCOUNT_ID?'Solange':'Mensaje…';}
export type BubbleToken={background:string;color:string;border?:string;radius:number;gradient?:readonly [string,string]};
export const BUBBLE_TOKENS:Record<BubbleStyleVariant,BubbleToken>={
 classic:{background:'#7A64BE',color:'#FFFFFF',radius:20},
 minimal:{background:'#FFFFFF',border:'#2B4A8B',color:'#101010',radius:8},
 glass:{background:'#E6E9EC',border:'#C3C9CF',color:'#101010',radius:14},
 gradient:{background:'#3F6486',gradient:['#3F6486','#6F9CC4'],color:'#FFFFFF',radius:20},
 neon:{background:'#FFF6E5',border:'#E8B04B',color:'#101010',radius:14},
 elegant:{background:'#161616',color:'#FFFFFF',radius:20},
 compact:{background:'#1F8A5B',color:'#FFFFFF',radius:8},
 magenta:{background:'#AD2A73',color:'#FFFFFF',radius:14},
 glass_graphite:{background:'#D3DAE0E8',gradient:['#F2F5F7E8','#AEBBC9E8'],border:'#9BA9B6',color:'#192734',radius:12},
 glass_blue:{background:'#D1E5F1E8',gradient:['#EBF6FCE8','#9ABDD5E8'],border:'#87AFC8',color:'#18364D',radius:12},
};
