// Test the validation logic
function cleanProjectName(name) {
  return name
    .replace(/[#*`_~]/g, '') // Remove markdown formatting
    .replace(/^\s*[-•]\s*/, '') // Remove list markers
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function isValidProjectName(name) {
  return name.length >= 2 && 
         name.length <= 100 && 
         !/^(the|a|an|my|our|your)\s+/i.test(name) &&
         !/^(readme|documentation|docs|guide|tutorial|example|sample|demo|test)$/i.test(name);
}

const testNames = [
  'My Awesome Project',
  '**My _Awesome_ Project**',
  'README',
  'Installation',
  'Project'
];

testNames.forEach(name => {
  const cleaned = cleanProjectName(name);
  const valid = isValidProjectName(cleaned);
  console.log(`"${name}" -> "${cleaned}" -> ${valid}`);
});