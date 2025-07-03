import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

async function buildRegistry() {
  try {
    // Define paths
    const componentsDir = path.join(process.cwd(), 'registry', 'components')
    const registryFile = path.join(process.cwd(), 'registry.json')

    // Create base registry structure
    const registry = {
      "$schema": "https://ui.shadcn.com/schema/registry.json",
      "name": "murphy",
      "homepage": "https://murphy.vercel.app/",
      "items": [] as any[]
    }

    // Read all files from components directory
    const files = fs.readdirSync(componentsDir)
    
    // Process each JSON file
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(componentsDir, file)
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        registry.items.push(content)
      }
    }

    // Write the combined registry file
    fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2))
    console.log('✓ Registry file generated successfully')

    // Run shadcn build
    console.log('Running shadcn build...')
    execSync('shadcn build', { stdio: 'inherit' })
    console.log('✓ shadcn build completed')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

buildRegistry()
