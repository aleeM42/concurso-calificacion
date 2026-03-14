import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                adminDashboard: resolve(__dirname, 'admin-dashboard.html'),
                adminWorks: resolve(__dirname, 'admin-works.html'),
                adminJudges: resolve(__dirname, 'admin-judges.html'),
                adminResults: resolve(__dirname, 'admin-results.html'),
                judgeScoring: resolve(__dirname, 'judge-scoring.html'),
                judgeMyScores: resolve(__dirname, 'judge-my-scores.html'),
                adminContests: resolve(__dirname, 'admin-contests.html'),
            },
        },
    },
});
