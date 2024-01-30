import fg from 'fast-glob'
import path from 'node:path'
import fs from 'fs/promises'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { compileTemplate, compileScript, parse } from 'vue/compiler-sfc'

const layout = await fs.readFile('layout.html', 'utf-8')

const app = createSSRApp({
  data: () => ({ 
    lang: 'en', 
    title: 'Hello World',
    greeting: 'Hello',
  }),
  template: layout
})

app.component('GreetingBlock', {
  props: ['text'],
  template: `<div>{{ text }} <slot /></div>`,
})

const components = await fg('components/*.html')

for (const component of components) {
  const name = component.split('/').pop().replace('.html', '')
  const componentSource = await fs.readFile(component, 'utf-8')
  
  // Parse the SFC using @vue/compiler-sfc
  const { descriptor } = parse(componentSource, 
    { 
      filename: component.split('/').pop(), 
    }
  )

  const template = compileTemplate({
    source: descriptor.template.content,
    filename: descriptor.filename,
    id: descriptor.filename,
  })

  const script = compileScript(descriptor, {
    id: descriptor.filename,
    inlineTemplate: true,
    refSugar: true,
  })

  app.component(name, {
    template,
    ...script,
  })
}

;(async () => {
  renderToString(app).then(async html => {
    await writeFile('dist/index.html', html)
  })
})()

async function fileExists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function writeFile(filePath, data) {
  try {
    const dirname = path.dirname(filePath)
    const exists = await fileExists(dirname)
    if (!exists) {
      await fs.mkdir(dirname, {recursive: true})
    }
    
    await fs.writeFile(filePath, data, 'utf8')
  } catch (err) {
    throw new Error(err)
  }
}
