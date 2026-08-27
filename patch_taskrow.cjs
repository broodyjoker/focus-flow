const fs = require('fs');
let code = fs.readFileSync('src/components/TaskRow.tsx', 'utf8');

const targetStr = '{task.isRoutine && <span';
const startIdx = code.indexOf(targetStr);
const endStr = '</button>';
// Find the right chevron button
const chevronStart = code.indexOf('{/* Right chevron */}', startIdx);
const endIdx = code.indexOf(endStr, chevronStart);

if (startIdx > -1 && endIdx > -1) {
  const block = code.substring(startIdx, endIdx + endStr.length);
  const indentedBlock = block.split('\n').map(line => '  ' + line).join('\n');
  const wrapped = '<div className="flex items-center gap-2 shrink-0 whitespace-nowrap">\n' + indentedBlock + '\n        </div>';
  
  code = code.substring(0, startIdx) + wrapped + code.substring(endIdx + endStr.length);
  fs.writeFileSync('src/components/TaskRow.tsx', code, 'utf8');
  console.log('Successfully wrapped icons');
} else {
  console.log('Could not find block', startIdx, endIdx);
}
