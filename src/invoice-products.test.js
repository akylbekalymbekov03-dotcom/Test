import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {invoiceProducts} from './invoice-products.js';
test('Товары из макетов сходятся с исходными суммами соответствующих накладных',()=>{
 const invoices=JSON.parse(readFileSync(new URL('../public/data/invoices.json',import.meta.url),'utf8'));
 for(const [id,items] of Object.entries(invoiceProducts)){
  const row=invoices.find(r=>String(r[0])===id);
  assert.ok(row,`Есть накладная ${id}`);
  assert.equal(items.reduce((sum,item)=>sum+Math.round(item[2]*100),0),Math.round(row[7]*100),id);
 }
});
