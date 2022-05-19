import React from 'react';
import { render } from 'react-dom';
import { ProviderContext as ProviderContextV1 } from './fake_node_modules/context-v1.0.0';
import { ProviderContext as ProviderContextV11 } from './fake_node_modules/context-v1.1.0';
import { ProviderContext as ProviderContextV2 } from './fake_node_modules/context-v2.0.0';

const root = document.getElementById('root');

function Example() {
  const ctx = React.useContext(ProviderContextV1);
  const ctxV11 = React.useContext(ProviderContextV11);
  const ctxV2 = React.useContext(ProviderContextV2);
  return (
    <>
      <pre>1.0.0: {JSON.stringify(ctx)}</pre>
      <pre>1.1.0: {JSON.stringify(ctxV11)}</pre>
      <pre>2.0.0: {JSON.stringify(ctxV2)}</pre>
    </>
  );

}

function App() {
  return (
    <ProviderContextV1.Provider value={{ foo: 'red', bar: 'blue' }}>
      <ProviderContextV2.Provider value={{bar: 'white', baz: 'black'}}>
        <Example />
      </ProviderContextV2.Provider>
    </ProviderContextV1.Provider>
  );
}

render(<App />, root);
