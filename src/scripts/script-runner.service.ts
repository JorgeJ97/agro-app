import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScriptRunnerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScriptRunnerService.name);

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const statusProject = this.configService.get<string>('STATUS_PROJECT') || 'development';
    const runScripts = this.configService.get<string>('RUN_SQL_SCRIPTS') || 'false';
    
    if (statusProject === 'development' || runScripts === 'true') {
      await this.runSqlScripts();
    } else {
      this.logger.log('Ejecución de scripts SQL deshabilitada');
    }
  }

  private async runSqlScripts() {
    try {
      this.logger.log('Buscando scripts SQL...');

      const scriptsDir = join(process.cwd(), 'sql-scripts');
      
      if (!existsSync(scriptsDir)) {
        this.logger.warn(`Carpeta de scripts no encontrada: ${scriptsDir}`);
        return;
      }

      const files = readdirSync(scriptsDir)
        .filter(file => file.endsWith('.sql'))
        .sort((a, b) => {
          // Ordenar por prefijos numéricos: 01-, 02-, etc.
          const getNumber = (filename: string) => {
            const match = filename.match(/^(\d+)[-_]/);
            return match ? parseInt(match[1], 10) : 999;
          };
          return getNumber(a) - getNumber(b);
        });

      if (files.length === 0) {
        this.logger.log('No se encontraron scripts SQL para ejecutar');
        return;
      }

      this.logger.log(`Encontrados ${files.length} scripts SQL: ${files.join(', ')}`);

      for (const file of files) {
        await this.executeScriptFile(file);
      }

      this.logger.log('🎉 Procesamiento de scripts completado');
    } catch (error) {
      this.logger.error('💥 Error en la ejecución de scripts:', error);
    }
  }

  private async executeScriptFile(filename: string): Promise<void> {
    const scriptsDir = join(process.cwd(), 'sql-scripts');
    const scriptPath = join(scriptsDir, filename);
    
    try {
      const sqlContent = readFileSync(scriptPath, 'utf8');
      this.logger.log(`📁 Ejecutando script: ${filename}`);
      
      // Ejecutar el script completo como una sola query
      // Esto evita problemas con el parsing de statements
      await this.dataSource.query(sqlContent);
      
      this.logger.log(`✅ Script ${filename} ejecutado exitosamente`);
      
    } catch (error) {
      this.logger.error(`❌ Error ejecutando script ${filename}:`, error.message);
      
      // Log adicional para debugging
      if (error.detail) {
        this.logger.error(`Detalle: ${error.detail}`);
      }
      if (error.where) {
        this.logger.error(`Donde: ${error.where}`);
      }
    }
  }
}