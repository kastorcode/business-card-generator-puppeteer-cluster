import { dirname, join } from 'node:path'
import querystring from 'node:querystring'
import { fileURLToPath } from 'node:url'
import { Cluster } from 'puppeteer-cluster'
import { v1 } from 'uuid'

import data from '../resources/data.json' assert { type: "json" }


const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://erickwendel.github.io/business-card-template/index.html'


function createQueryStringFromObject (data) {
  return querystring.stringify(data, null, null, {
    encodeURIComponent: querystring.unescape
  })
}


async function render ({ page, data: { name, url }}) {
  const path = join(__dirname, `./../output/${name}-${v1()}.pdf`)
  await page.goto(url, { waitUntil: 'networkidle2' })
  await page.pdf({
    path, format: 'A4', landscape: true, printBackground: true
  })
  console.log('ended', path)
}


async function main () {
  try {
    const cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT, maxConcurrency: 10
    })
    await cluster.task(render)
    for (const item of data) {
      const url = `${BASE_URL}?${createQueryStringFromObject(item)}`
      await cluster.queue({ name: item.name, url })
    }
    await cluster.idle()
    await cluster.close()
  }
  catch (error) {
    console.error(`${process.pid} has broken! ${error.stack}`)
  }
}


main()