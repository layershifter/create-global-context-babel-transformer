import React from 'react';
import { render } from 'react-dom';
import { context } from './context';
import { context as globalContext } from './globalContext';

const root = document.getElementById('root');

function App() {
  const contextValue = React.useContext(context);
  const globalContextValue = React.useContext(globalContext);
  return (
    <>
      <div>{contextValue}</div>
      <div>{globalContextValue}</div>
    </>
  );
}

render(<App />, root);
