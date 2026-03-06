export type KBChunk = {
  id: string;
  sourceFile: string;
  text: string;
  index: number;
};

export type KBIndex = {
  knowledgeBaseId: string;
  createdAt: string;
  chunks: KBChunk[];
};
