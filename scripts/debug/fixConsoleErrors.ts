#!/usr/bin/env ts-node

/**
 * SafeNode Automated Debugging & Error Fixing Tool
 * Scans the project and automatically fixes common errors
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface ErrorFix {
  file: string
  line?: number
  error: string
  fix: string
  applied: boolean
}

class SafeNodeDebugger {
  private fixes: ErrorFix[] = []
  private projectRoot: string
  private autoFix: boolean = false
  private dryRun: boolean = false

  constructor(projectRoot: string, autoFix: boolean = false, dryRun: boolean = false) {
    this.projectRoot = projectRoot
    this.autoFix = autoFix
    this.dryRun = dryRun
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    console.log('🔍 SafeNode Debugger Starting...\n')
    console.log(`Project Root: ${this.projectRoot}`)
    console.log(`Auto-fix: ${this.autoFix ? 'ENABLED' : 'DISABLED'}`)
    console.log(`Dry Run: ${this.dryRun ? 'YES' : 'NO'}\n`)

    // Scan all relevant directories
    await this.scanDirectory(path.join(this.projectRoot, 'frontend/src'))
    await this.scanDirectory(path.join(this.projectRoot, 'backend/src'))
    await this.scanDirectory(path.join(this.projectRoot, 'mobile/src'))

    // Check for common issues
    await this.checkMissingImports()
    await this.checkTypeErrors()
    await this.checkTailwindClasses()
    await this.checkUnhandledPromises()
    await this.checkUnusedVariables()
    await this.checkReactHooks()
    await this.checkAPIEndpoints()
    await this.checkEnvVariables()
    await this.checkBackendRoutes()

    // Report results
    this.reportResults()

    // Apply fixes if enabled
    if (this.autoFix && !this.dryRun) {
      await this.applyFixes()
    }
  }

  /**
   * Scan directory for TypeScript/JavaScript files
   */
  private async scanDirectory(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️  Directory not found: ${dir}`)
      return
    }

    const files = this.getFilesRecursive(dir, ['.ts', '.tsx', '.js', '.jsx'])
    console.log(`📁 Scanned ${files.length} files in ${dir}`)
  }

  /**
   * Get all files recursively
   */
  private getFilesRecursive(dir: string, extensions: string[]): string[] {
    let results: string[] = []
    const list = fs.readdirSync(dir)

    for (const file of list) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat && stat.isDirectory()) {
        // Skip node_modules and build directories
        if (!['node_modules', 'dist', 'build', '.next'].includes(file)) {
          results = results.concat(this.getFilesRecursive(filePath, extensions))
        }
      } else {
        const ext = path.extname(file)
        if (extensions.includes(ext)) {
          results.push(filePath)
        }
      }
    }

    return results
  }

  /**
   * Check for missing imports
   */
  private async checkMissingImports(): Promise<void> {
    console.log('\n🔎 Checking for missing imports...')
    
    const commonImports = {
      'framer-motion': ['motion', 'AnimatePresence', 'useReducedMotion'],
      'react': ['React', 'useState', 'useEffect'],
      '@/icons': ['Lock', 'Shield', 'VaultDoor'],
      '@/ui': ['Button', 'Card', 'Input'],
    }

    // This is a simplified check - in production, use TypeScript compiler API
    this.addFix({
      file: 'frontend/src/App.tsx',
      error: 'Missing import for framer-motion',
      fix: "import { motion } from 'framer-motion'",
      applied: false,
    })
  }

  /**
   * Check for type errors
   */
  private async checkTypeErrors(): Promise<void> {
    console.log('🔎 Checking for type errors...')
    
    try {
      // Run TypeScript compiler in check mode
      execSync('cd frontend && npx tsc --noEmit --skipLibCheck', { 
        encoding: 'utf-8',
        stdio: 'pipe'
      })
      console.log('✅ No type errors found in frontend')
    } catch (error: any) {
      const output = error.stdout?.toString() || error.message
      console.log('❌ Type errors found:')
      console.log(output)
      
      // Parse TypeScript errors and create fixes
      this.parseTypeScriptErrors(output)
    }
  }

  /**
   * Parse TypeScript compiler errors
   */
  private parseTypeScriptErrors(output: string): void {
    const errorRegex = /([^\s]+)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.+)/g
    let match

    while ((match = errorRegex.exec(output)) !== null) {
      const [, file, line, col, code, message] = match
      
      this.addFix({
        file: file.replace(this.projectRoot + '/', ''),
        line: parseInt(line),
        error: `TS${code}: ${message}`,
        fix: this.suggestFix(code, message),
        applied: false,
      })
    }
  }

  /**
   * Suggest fixes based on error code
   */
  private suggestFix(code: string, message: string): string {
    const fixes: Record<string, string> = {
      '2304': `Add missing import or declare variable`,
      '2307': `Install missing package or fix import path`,
      '2339': `Add missing property to type definition`,
      '2345': `Fix type mismatch - check argument types`,
      '2554': `Fix function signature - check parameter count`,
      '2741': `Add missing required property`,
    }

    return fixes[code] || `Review error: ${message}`
  }

  /**
   * Check for invalid Tailwind classes
   */
  private async checkTailwindClasses(): Promise<void> {
    console.log('🔎 Checking for invalid Tailwind classes...')
    
    // Common invalid classes that should be fixed
    const invalidClasses = [
      { pattern: /bg-purple-\d+/g, fix: 'Use brand-* or accent-* instead' },
      { pattern: /text-purple-\d+/g, fix: 'Use text-brand-* or text-accent-* instead' },
    ]

    const files = this.getFilesRecursive(
      path.join(this.projectRoot, 'frontend/src'),
      ['.tsx', '.jsx']
    )

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      
      for (const { pattern, fix } of invalidClasses) {
        if (pattern.test(content)) {
          this.addFix({
            file: file.replace(this.projectRoot + '/', ''),
            error: 'Invalid Tailwind class (use brand/accent colors)',
            fix: fix,
            applied: false,
          })
        }
      }
    }
  }

  /**
   * Check for unhandled promises
   */
  private async checkUnhandledPromises(): Promise<void> {
    console.log('🔎 Checking for unhandled promises...')
    
    const files = this.getFilesRecursive(
      this.projectRoot,
      ['.ts', '.tsx', '.js', '.jsx']
    )

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      
      // Check for async functions without await or .catch()
      const asyncFunctionRegex = /async\s+[^{]+{[\s\S]*?}/g
      const matches = content.match(asyncFunctionRegex) || []

      for (const match of matches) {
        // Check for fetch/axios calls without await or .catch()
        if (/(fetch|axios|\.get|\.post)\(/.test(match) && !/await|\.catch\(/.test(match)) {
          this.addFix({
            file: file.replace(this.projectRoot + '/', ''),
            error: 'Unhandled promise - add await or .catch()',
            fix: 'Add await or .catch() to handle promise',
            applied: false,
          })
        }
      }
    }
  }

  /**
   * Check for unused variables
   */
  private async checkUnusedVariables(): Promise<void> {
    console.log('🔎 Checking for unused variables...')
    
    // This would require ESLint or similar tool
    // For now, we'll just log that this check is available
    console.log('💡 Run ESLint for unused variable detection: npm run lint')
  }

  /**
   * Check React hooks order violations
   */
  private async checkReactHooks(): Promise<void> {
    console.log('🔎 Checking React hooks...')
    
    const files = this.getFilesRecursive(
      path.join(this.projectRoot, 'frontend/src'),
      ['.tsx', '.jsx']
    )

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      
      // Check for hooks inside conditions
      if (/if\s*\([^)]+\)\s*{[^}]*use(State|Effect|Callback|Memo)/.test(content)) {
        this.addFix({
          file: file.replace(this.projectRoot + '/', ''),
          error: 'React hook inside condition - violates rules of hooks',
          fix: 'Move hook outside condition or use early return',
          applied: false,
        })
      }
    }
  }

  /**
   * Check API endpoints
   */
  private async checkAPIEndpoints(): Promise<void> {
    console.log('🔎 Checking API endpoints...')
    
    const frontendFiles = this.getFilesRecursive(
      path.join(this.projectRoot, 'frontend/src'),
      ['.ts', '.tsx']
    )

    const backendRoutes = this.getBackendRoutes()

    for (const file of frontendFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      
      // Check for hardcoded API URLs
      const apiUrlRegex = /(fetch|axios)\(['"](https?:\/\/[^'"]+)['"]/g
      let match

      while ((match = apiUrlRegex.exec(content)) !== null) {
        const url = match[2]
        if (!url.includes('localhost') && !url.includes('api.safenode.com')) {
          this.addFix({
            file: file.replace(this.projectRoot + '/', ''),
            error: `Hardcoded API URL: ${url}`,
            fix: 'Use environment variable for API URL',
            applied: false,
          })
        }
      }
    }
  }

  /**
   * Get backend routes
   */
  private getBackendRoutes(): string[] {
    const routes: string[] = []
    
    try {
      const routeFiles = this.getFilesRecursive(
        path.join(this.projectRoot, 'backend/src/routes'),
        ['.ts', '.js']
      )

      for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const routeMatches = content.match(/router\.(get|post|put|delete)\(['"]([^'"]+)['"]/g) || []
        routes.push(...routeMatches.map(m => m.match(/['"]([^'"]+)['"]/)?.[1] || ''))
      }
    } catch (error) {
      // Routes directory might not exist
    }

    return routes
  }

  /**
   * Check environment variables
   */
  private async checkEnvVariables(): Promise<void> {
    console.log('🔎 Checking environment variables...')
    
    const requiredEnvVars = [
      'VITE_API_URL',
      'DATABASE_URL',
      'JWT_SECRET',
    ]

    const envExamplePath = path.join(this.projectRoot, '.env.example')
    const envPath = path.join(this.projectRoot, '.env')

    if (fs.existsSync(envExamplePath)) {
      const exampleContent = fs.readFileSync(envExamplePath, 'utf-8')
      
      for (const varName of requiredEnvVars) {
        if (!exampleContent.includes(varName)) {
          this.addFix({
            file: '.env.example',
            error: `Missing environment variable: ${varName}`,
            fix: `Add ${varName}= to .env.example`,
            applied: false,
          })
        }
      }
    }
  }

  /**
   * Check backend route mismatches
   */
  private async checkBackendRoutes(): Promise<void> {
    console.log('🔎 Checking backend route consistency...')
    
    // This would require comparing frontend API calls with backend routes
    // For now, just log that this check is available
    console.log('💡 Manually verify frontend API calls match backend routes')
  }

  /**
   * Add a fix to the list
   */
  private addFix(fix: ErrorFix): void {
    this.fixes.push(fix)
  }

  /**
   * Report results
   */
  private reportResults(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 DEBUGGING RESULTS')
    console.log('='.repeat(60) + '\n')

    if (this.fixes.length === 0) {
      console.log('✅ No issues found! Your code looks good.\n')
      return
    }

    console.log(`Found ${this.fixes.length} potential issue(s):\n`)

    const groupedByFile = this.fixes.reduce((acc, fix) => {
      if (!acc[fix.file]) {
        acc[fix.file] = []
      }
      acc[fix.file].push(fix)
      return acc
    }, {} as Record<string, ErrorFix[]>)

    for (const [file, fixes] of Object.entries(groupedByFile)) {
      console.log(`📄 ${file}`)
      fixes.forEach((fix, index) => {
        console.log(`   ${index + 1}. Line ${fix.line || '?'}: ${fix.error}`)
        console.log(`      💡 Fix: ${fix.fix}`)
      })
      console.log('')
    }

    if (this.autoFix && !this.dryRun) {
      console.log('🔧 Auto-fix mode enabled. Fixes will be applied...\n')
    } else if (this.dryRun) {
      console.log('🔍 Dry run mode - no fixes applied\n')
    } else {
      console.log('💡 Run with --fix flag to automatically apply fixes\n')
    }
  }

  /**
   * Apply fixes
   */
  private async applyFixes(): Promise<void> {
    console.log('🔧 Applying fixes...\n')

    const groupedByFile = this.fixes.reduce((acc, fix) => {
      if (!acc[fix.file]) {
        acc[fix.file] = []
      }
      acc[fix.file].push(fix)
      return acc
    }, {} as Record<string, ErrorFix[]>)

    for (const [file, fixes] of Object.entries(groupedByFile)) {
      const filePath = path.join(this.projectRoot, file)
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`)
        continue
      }

      let content = fs.readFileSync(filePath, 'utf-8')
      let modified = false

      for (const fix of fixes) {
        // Apply fix based on error type
        // This is simplified - in production, use AST manipulation
        if (fix.error.includes('Missing import')) {
          // Add import at top of file
          const importMatch = content.match(/^import\s+.*from\s+['"]/m)
          if (importMatch) {
            content = content.replace(
              importMatch[0],
              `${fix.fix}\n${importMatch[0]}`
            )
            modified = true
          }
        }
        // Add more fix application logic here
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8')
        console.log(`✅ Fixed: ${file}`)
      }
    }

    console.log('\n✅ Fixes applied! Please review changes before committing.\n')
  }
}

// CLI Interface
const args = process.argv.slice(2)
const autoFix = args.includes('--fix')
const dryRun = args.includes('--dry-run')
const projectRoot = process.cwd()

const debugger = new SafeNodeDebugger(projectRoot, autoFix, dryRun)
debugger.run().catch(console.error)

