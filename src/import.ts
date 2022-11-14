import { Index, MeiliSearch } from 'meilisearch'
import { indexName, server } from './config';
import { filterProps, Gebouw } from './schema';

async function createSolrQuery(index: Index) {

  let pagesize = 1000;
  let pages = 1000;
  let start = 0;
  let documents = [];
  for (let i = 0; i < pages; i++) {
    let url = `http://localhost:8983/solr/gbp/query?q=*:*&q.op=OR&indent=true&rows=${pagesize}&start=${start}&sort=id%20asc`;
    start += pagesize;
    let resp = await fetch(url);
    let json = await resp.json();
    let docs = parseResponse(json);
    if (docs.length == 0) {
      break;
    }
    index.addDocuments(docs);
  }

}

function parseResponse(response: any): Gebouw[] {
  let gebouwen = [];
    response['response']['docs'].forEach((doc: any) => {
      console.log('doc', doc);
      gebouwen.push(doc as Gebouw)
    })
  return gebouwen
}

export async function importData() {
  const client = new MeiliSearch({ host: server })
  await client.deleteIndex(indexName)
  const index = client.index(indexName);
  createSolrQuery(index);
  index.updateFilterableAttributes(filterProps.map((prop) => prop.propKey))
  index.updateSortableAttributes(["bag-num-volledig"])
}

// export async function importDataDemo() {
//   const client = new MeiliSearch({ host: server })
//   await client.deleteIndex(indexName)
//   const index = client.index(indexName);
//   index.addDocuments(testData)
//   index.updateFilterableAttributes(filterProps.map((prop) => prop.propKey))
//   index.updateSortableAttributes(["bag-num-volledig"])
//   index.updateSynonyms(synonyns)
// }
