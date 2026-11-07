import { handle } from '../_lib/api';

export const onRequest = async (ctx: any) => handle(ctx.request, ctx.env);
