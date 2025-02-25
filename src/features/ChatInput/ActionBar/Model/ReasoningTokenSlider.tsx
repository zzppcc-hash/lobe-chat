import { InputNumber, Slider } from 'antd';
import { memo, useMemo } from 'react';
import { Flexbox } from 'react-layout-kit';
import useMergeState from 'use-merge-value';

const Kibi = 1024;

const exponent = (num: number) => Math.log2(num);
const getRealValue = (num: number) => Math.round(Math.pow(2, num));
const powerKibi = (num: number) => Math.round(Math.pow(2, num) * Kibi);

interface MaxTokenSliderProps {
  defaultValue?: number;
  onChange?: (value: number) => void;
  value?: number;
}

const MaxTokenSlider = memo<MaxTokenSliderProps>(({ value, onChange, defaultValue }) => {
  const [token, setTokens] = useMergeState(0, {
    defaultValue,
    onChange,
    value: value,
  });

  const [powValue, setPowValue] = useMergeState(0, {
    defaultValue: exponent(typeof defaultValue === 'undefined' ? 0 : defaultValue / 1024),
    value: exponent(typeof value === 'undefined' ? 0 : value / Kibi),
  });

  const updateWithPowValue = (value: number) => {
    setPowValue(value);

    setTokens(powerKibi(value));
  };

  const updateWithRealValue = (value: number) => {
    setTokens(Math.round(value));

    setPowValue(exponent(value / Kibi));
  };

  const marks = useMemo(() => {
    return {
      [exponent(1)]: '1k',
      [exponent(2)]: '2k',
      [exponent(4)]: '4k', // 4 kibi = 4096
      [exponent(8)]: '8k',
      [exponent(16)]: '16k',
      [exponent(32)]: '32k',
      [exponent(64)]: '64k',
    };
  }, []);

  return (
    <Flexbox align={'center'} gap={12} horizontal>
      <Flexbox flex={1}>
        <Slider
          marks={marks}
          max={exponent(64)}
          min={exponent(1)}
          onChange={updateWithPowValue}
          step={null}
          tooltip={{
            formatter: (x) => {
              if (typeof x === 'undefined') return;

              let value = getRealValue(x);

              if (value < Kibi) return ((value * Kibi) / 1000).toFixed(0) + 'k';
            },
          }}
          value={powValue}
        />
      </Flexbox>
      <div>
        <InputNumber
          changeOnWheel
          min={0}
          onChange={(e) => {
            if (!e && e !== 0) return;

            updateWithRealValue(e);
          }}
          step={4 * Kibi}
          style={{ width: 60 }}
          value={token}
        />
      </div>
    </Flexbox>
  );
});
export default MaxTokenSlider;
