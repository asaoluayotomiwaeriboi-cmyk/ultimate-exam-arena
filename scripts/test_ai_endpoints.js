(async () => {
  const base = 'http://localhost:5000';
  try {
    let res = await fetch(base + '/api/ai/tyla/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'How do I prepare for JAMB Mathematics?' }),
    });
    let j = await res.json();
    console.log('tyla ask:', j);

    res = await fetch(base + '/api/ai/tyla/exam-tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'Mathematics' }),
    });
    j = await res.json();
    console.log('tyla tips:', j);

    res = await fetch(base + '/api/ai/chris/validate-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: { questionText: 'Is 2+2=4?', choices: ['2', '3', '4', '5'], answer: '4' },
      }),
    });
    j = await res.json();
    console.log('chris validate:', j);

    process.exit(0);
  } catch (err) {
    console.error('AI test error:', err);
    process.exit(1);
  }
})();
