import * as fs from 'fs';
import * as path from 'path';

export class FileUtils {
    static async ensureDirectory(dirPath: string): Promise<void> {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    static async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    static async readFile(filePath: string): Promise<string> {
        return fs.promises.readFile(filePath, 'utf8');
    }

    static async writeFile(filePath: string, content: string): Promise<void> {
        await this.ensureDirectory(path.dirname(filePath));
        await fs.promises.writeFile(filePath, content, 'utf8');
    }

    static getRelativePath(from: string, to: string): string {
        return path.relative(from, to);
    }

    static joinPath(...paths: string[]): string {
        return path.join(...paths);
    }

    static getBasename(filePath: string): string {
        return path.basename(filePath);
    }

    static getDirname(filePath: string): string {
        return path.dirname(filePath);
    }

    static getExtension(filePath: string): string {
        return path.extname(filePath);
    }
}