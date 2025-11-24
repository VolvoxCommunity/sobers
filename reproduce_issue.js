const target = {
  name: 'SupabaseClient',
  checkContext() {
    return this === target;
  },
};

// Current implementation simulation
const currentProxy = new Proxy(
  {},
  {
    get: (_, prop) => {
      return target[prop];
    },
  }
);

console.log('--- Current Implementation ---');
try {
  const isCorrectContext = currentProxy.checkContext();
  console.log('Is "this" the target?', isCorrectContext);
  if (!isCorrectContext) {
    console.log('FAILURE: "this" is NOT the target (it is likely the proxy)');
  }
} catch (e) {
  console.log('Error calling checkContext():', e.message);
}

// Fixed implementation simulation
const fixedProxy = new Proxy(
  {},
  {
    get: (_, prop) => {
      const value = target[prop];
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    },
  }
);

console.log('\n--- Fixed Implementation ---');
try {
  const isCorrectContext = fixedProxy.checkContext();
  console.log('Is "this" the target?', isCorrectContext);
  if (isCorrectContext) {
    console.log('SUCCESS: "this" IS the target');
  }
} catch (e) {
  console.log('Error calling checkContext():', e.message);
}
