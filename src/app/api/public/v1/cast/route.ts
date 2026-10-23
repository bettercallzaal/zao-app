import { handlePublicRead, publicOptions } from '@/lib/workspace/public-api';
export const GET = (request: Request) => handlePublicRead(request, 'cast');
export const OPTIONS = publicOptions;
