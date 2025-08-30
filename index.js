

const fs = require('fs');


// ------------------------------
// BigInt helpers (exact rationals)
// ------------------------------
function absBigInt(a) { return a < 0n ? -a : a; }
function gcdBigInt(a, b) {
a = absBigInt(a); b = absBigInt(b);
while (b !== 0n) { const t = a % b; a = b; b = t; }
return a;
}
class Frac { // Rational number: num/den, both BigInt, den > 0
constructor(num, den = 1n) {
if (den === 0n) throw new Error('Zero denominator');
if (den < 0n) { num = -num; den = -den; }
const g = gcdBigInt(num, den);
this.num = num / g;
this.den = den / g;
}
static fromBigInt(x) { return new Frac(x, 1n); }
add(other) { return new Frac(this.num * other.den + other.num * this.den, this.den * other.den); }
sub(other) { return new Frac(this.num * other.den - other.num * this.den, this.den * other.den); }
mul(other) { return new Frac(this.num * other.num, this.den * other.den); }
div(other) { return new Frac(this.num * other.den, this.den * other.num); }
}
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
function parseInBase(str, base) {
str = str.trim().toLowerCase();
const maxIdx = BigInt(base);
let val = 0n;
for (const ch of str) {
const d = BigInt(DIGITS.indexOf(ch));
if (d < 0n || d >= maxIdx) throw new Error(`Invalid digit '${ch}' for base ${base}`);
val = val * maxIdx + d;
}
return val;
}
function lagrangeEvalAt(points, X) {
// points: [{x: BigInt, y: BigInt}], X: BigInt
let total = new Frac(0n, 1n);
for (let i = 0; i < points.length; i++) {
const xi = points[i].x, yi = points[i].y;
let num = new Frac(1n, 1n);
let den = new Frac(1n, 1n);
for (let j = 0; j < points.length; j++) {
if (i === j) continue;
const xj = points[j].x;
num = num.mul(new Frac(X - xj, 1n));
den = den.mul(new Frac(xi - xj, 1n));
}
const Li = num.div(den);
total = total.add( Li.mul(new Frac(yi, 1n)) );
}
return total; // Frac
}
function* combinations(arr, k) {
const n = arr.length;
const idx = Array.from({ length: k }, (_, i) => i);
function snapshot() { return idx.map(i => arr[i]); }
if (k === 0) { yield []; return; }
if (k > n) return;
yield snapshot();
while (true) {
let i;
for (i = k - 1; i >= 0; i--) {
if (idx[i] !== i + n - k) break;
}
if (i < 0) return;
idx[i]++;
for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
yield snapshot();
}
}
function solve(data) {
const n = BigInt(data.keys.n); // not strictly needed as BigInt, but OK
const k = Number(data.keys.k);
// Build points (x, y) with huge y
const points = Object.entries(data)
.filter(([key]) => key !== 'keys')
.map(([key, obj]) => ({
x: BigInt(key),
y: parseInBase(String(obj.value), Number(obj.base))
}))
.sort((a, b) => (a.x < b.x ? -1 : 1));


if (points.length !== Number(n)) throw new Error('n does not match number of shares');


let best = null; // {subset, secretFrac, okFlags, count}
for (const subset of combinations(points, k)) {
const secret = lagrangeEvalAt(subset, 0n); // f(0)
let count = 0;
const okFlags = [];
for (const p of points) {
const val = lagrangeEvalAt(subset, p.x);
const equal = (val.num === p.y * val.den);
okFlags.push(equal);
if (equal) count++;
}
if (!best || count > best.count || (count === best.count && secret.den === 1n)) {
best = { subset, secretFrac: secret, okFlags, count };
}
}
const wrong = [];
for (let i = 0; i < points.length; i++) {
if (!best.okFlags[i]) wrong.push(points[i].x.toString());
}


// Secret as integer if possible
let secretOut;
if (best.secretFrac.den === 1n) secretOut = best.secretFrac.num.toString();
else secretOut = `${best.secretFrac.num.toString()}/${best.secretFrac.den.toString()}`;


return { secret: secretOut, wrong };
}
(function main() {
const file = process.argv[2];
if (!file) {
console.error('Usage: node index.js <testcase.json>');
process.exit(1);
}
const json = JSON.parse(fs.readFileSync(file, 'utf8'));
const { secret, wrong } = solve(json);
console.log(`Secret: ${secret}`);
console.log(`Wrong data set points: ${wrong.length ? '[' + wrong.join(', ') + ']' : 'None'}`);
})();