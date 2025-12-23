const fs = require('fs');
const path = require('path');

class RAGSystem {
    constructor(aiClient) {
        this.ai = aiClient;
        this.data = [];
        this.embeddings = [];
    }

    async loadData(filePath) {
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            this.data = JSON.parse(raw);
            console.log(`[RAG] Loaded ${this.data.length} documents.`);

            // In a real app, we would load pre-computed embeddings.
            // Here we compute them on startup (might be slow for large data).
            console.log('[RAG] Generating embeddings...');
            for (const item of this.data) {
                try {
                    const embedding = await this.generateEmbedding(item.text);
                    this.embeddings.push({ id: item.id, vector: embedding });
                } catch (e) {
                    console.error(`[RAG] Failed to embed item ${item.id}:`, e);
                }
            }
            console.log('[RAG] Embeddings generated.');
        } catch (error) {
            console.error('[RAG] Error loading data:', error);
        }
    }

    async generateEmbedding(text) {
        // Use Gemini text-embedding-004 model
        const response = await this.ai.models.embedContent({
            model: 'text-embedding-004',
            content: { parts: [{ text }] },
        });
        return response.embedding.values;
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async search(query, topK = 3) {
        try {
            const queryVector = await this.generateEmbedding(query);

            const scored = this.embeddings.map((emb, index) => {
                const score = this.cosineSimilarity(queryVector, emb.vector);
                return { item: this.data[index], score };
            });

            // Sort by score descending
            scored.sort((a, b) => b.score - a.score);

            return scored.slice(0, topK);
        } catch (error) {
            console.error('[RAG] Search failed:', error);
            return [];
        }
    }
}

module.exports = RAGSystem;
