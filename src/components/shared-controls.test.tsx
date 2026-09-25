import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, CodeBlock, Input, RadioGroup, Select } from '@full-stack-ds/react';
import { CodeViewer } from './CodeViewer';

const choices = [{ value: 'red', label: 'Red' }, { value: 'blue', label: 'Blue' }, { value: 'grey', label: 'Unavailable', disabled: true }];

describe('shared controls used by the showcase', () => {
  it('preserves intrinsic number and color semantics while delivering string values', () => {
    const onChange = vi.fn();
    render(<><Input type="number" ariaLabel="Count" defaultValue="2" onChange={onChange} /><Input type="color" ariaLabel="Ink" defaultValue="#112233" onChange={onChange} /></>);
    const number = screen.getByRole('spinbutton', { name: 'Count' });
    expect(number).not.toHaveAttribute('role');
    const color = screen.getByLabelText('Ink');
    expect(color).not.toHaveAttribute('role');
    fireEvent.change(number, { target: { value: '3' } });
    fireEvent.change(color, { target: { value: '#445566' } });
    expect(onChange.mock.calls).toEqual([['3'], ['#445566']]);
  });
  it('shows selected labels, closes a single selection and preserves controlled authority', () => {
    const change = vi.fn();
    const { rerender } = render(<Select options={choices} value="red" onChange={change} defaultOpen={false} triggerLabel="Color" />);
    const trigger = screen.getByRole('button', { name: 'Color' });
    expect(trigger).toHaveTextContent('Red');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: 'Blue' }));
    expect(change).toHaveBeenCalledWith('blue');
    expect(trigger).toHaveTextContent('Red');
    expect(screen.queryByRole('listbox')).toBeNull();
    rerender(<Select options={choices} value="blue" onChange={change} defaultOpen={false} triggerLabel="Color" />);
    expect(trigger).toHaveTextContent('Blue');
  });
  it('keeps independent radio groups and native form serialization', () => {
    function Groups() {
      const [value, setValue] = useState('red');
      return <form aria-label="Choices"><RadioGroup name="first" ariaLabel="First" options={choices} value={value} onChange={setValue} /><RadioGroup name="second" ariaLabel="Second" options={choices} defaultValue="red" /></form>;
    }
    render(<Groups />);
    fireEvent.click(screen.getAllByRole('radio', { name: 'Blue' })[0]);
    expect(screen.getAllByRole('radio', { name: 'Blue' })[0]).toBeChecked();
    expect(screen.getAllByRole('radio', { name: 'Red' })[1]).toBeChecked();
    expect([...new FormData(screen.getByRole('form') as HTMLFormElement)]).toEqual([['first', 'blue'], ['second', 'red']]);
    expect(screen.getAllByRole('radio', { name: 'Unavailable' })[0]).toBeDisabled();
  });
  it('uses consumer annotations instead of duplicating automatic source', () => {
    const click = vi.fn();
    const { container, rerender } = render(<CodeBlock code="canonical" language="plaintext"><Button onClick={click}>annotated</Button></CodeBlock>);
    expect(container.querySelector('pre')?.textContent).toBe('annotated');
    fireEvent.click(screen.getByRole('button', { name: 'annotated' }));
    expect(click).toHaveBeenCalledOnce();
    rerender(<CodeBlock code={'<tag>\n\tplain\n'} language="plaintext" />);
    expect(container.querySelector('pre')?.textContent).toBe('<tag>\n\tplain\n');
    expect(container.querySelector('tag')).toBeNull();
  });
  it('keeps the viewer on generated CodeBlock and copies canonical source', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { container } = render(<CodeViewer code={'first\n  second'} filename="example.ts" />);
    expect(container.querySelector('pre')).toHaveAttribute('data-fsds-component', 'code-block');
    fireEvent.click(screen.getByRole('button', { name: 'Copy code to clipboard' }));
    expect(writeText).toHaveBeenCalledWith('first\n  second');
  });
  it('uses CodeBlock syntax tokens in line-numbered source without changing the displayed code', () => {
    const source = '// layout primitive\nexport const Stack = <div title="ready" />;';
    const { container } = render(<CodeViewer code={source} filename="stack.tsx" />);
    const block = container.querySelector('pre');
    expect(block).toHaveAttribute('data-language', 'tsx');
    expect(block?.querySelector('[data-token="comment"]')).toHaveTextContent('// layout primitive');
    expect(block?.querySelector('[data-token="keyword"]')).toHaveTextContent('export');
    expect(block?.querySelector('[data-token="string"]')).toHaveTextContent('"ready"');
    expect([...container.querySelectorAll('.code-block__line')].map((line) => line.textContent?.replace(/\n$/, ''))).toEqual(source.split('\n'));
  });
  it.each([
    ['Button.css', '.button { color: red; }', 'css', 'property', 'color'],
    ['Button.tokens.json', '{"size": 2}', 'json', 'property', '"size"'],
    ['guide.md', '# Tokens', 'markdown', 'keyword', '#'],
  ])('selects %s syntax from its filename', (filename, source, language, tokenKind, tokenText) => {
    const { container } = render(<CodeViewer code={source} filename={filename} />);
    expect(container.querySelector('pre')).toHaveAttribute('data-language', language);
    expect(container.querySelector(`[data-token="${tokenKind}"]`)).toHaveTextContent(tokenText);
  });
  it.each(['Stack.svelte', 'Stack.vue'])('shows embedded TypeScript and CSS syntax in %s', (filename) => {
    const source = '<script lang="ts">\ninterface Props {\n  layout?: \'stack\' | \'inline\';\n}\n</script>\n<style>\n.stack { color: red; }\n</style>';
    const { container } = render(<CodeViewer code={source} filename={filename} />);
    expect(container.querySelector('pre')).toHaveAttribute('data-language', filename.endsWith('.vue') ? 'vue' : 'svelte');
    const layoutLine = [...container.querySelectorAll('.code-block__line')].find((line) => line.textContent?.includes('layout?:'));
    expect(layoutLine?.querySelector('[data-token="property"]')).toHaveTextContent('layout');
    expect(layoutLine?.querySelectorAll('[data-token="string"]')).toHaveLength(2);
    const styleLine = [...container.querySelectorAll('.code-block__line')].find((line) => line.textContent?.includes('color: red'));
    expect(styleLine?.querySelector('[data-token="property"]')).toHaveTextContent('color');
    expect([...container.querySelectorAll('.code-block__line')].map((line) => line.textContent?.replace(/\n$/, ''))).toEqual(source.split('\n'));
  });
  it('shows Lit tagged CSS and HTML syntax in the source viewer', () => {
    const source = 'static styles = css`a { color: red; }`;\nrender() { return html`<slot></slot>`; }';
    const { container } = render(<CodeViewer code={source} filename="Stack.ts" />);
    expect(container.querySelector('pre')).toHaveAttribute('data-language', 'typescript');
    expect(container.querySelector('[data-token="property"]')).toHaveTextContent('color');
    expect(container.querySelector('[data-token="tag"]')).toHaveTextContent('slot');
    expect([...container.querySelectorAll('.code-block__line')].map((line) => line.textContent?.replace(/\n$/, ''))).toEqual(source.split('\n'));
  });
  it('keeps trace ranges clickable after syntax coloring', () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    const hit = {
      contractPath: 'anatomy.dom.bindings.value',
      explanation: 'Value binding',
      kind: 'binding' as const,
      start: { line: 0, column: 6 },
      length: 5,
    };
    const onHitClick = vi.fn();
    try {
      const { container } = render(
        <CodeViewer code={'const value = "ready";'} filename="Button.tsx" hits={[hit]} selectedHitIndex={0} onHitClick={onHitClick} />,
      );
      const annotation = container.querySelector('[data-hit-index="0"]');
      expect(annotation).toHaveTextContent('value');
      expect(annotation).toHaveAttribute('data-selected', 'true');
      expect(container.querySelector('[data-token="keyword"]')).toHaveTextContent('const');
      expect(container.querySelector('[data-token="string"]')).toHaveTextContent('"ready"');
      expect(scrollIntoView).toHaveBeenCalledOnce();
      fireEvent.click(annotation!);
      expect(onHitClick).toHaveBeenCalledWith(hit);
    } finally {
      Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: originalScrollIntoView });
    }
  });
});
