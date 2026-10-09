import {NextResponse} from 'next/server';
import {carregarModeloFaturamento} from '../../../lib/faturamento-modelo';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{return NextResponse.json({status:'ok',...carregarModeloFaturamento()},{headers:{'Cache-Control':'no-store'}})}catch(e){console.error('Faturamento:',e);return NextResponse.json({status:'erro',erro:e instanceof Error?e.message:String(e)},{status:500})}}
