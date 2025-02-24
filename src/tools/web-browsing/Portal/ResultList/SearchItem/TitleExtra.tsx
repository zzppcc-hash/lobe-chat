import { Tooltip } from '@lobehub/ui';
import { Tag, Typography } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import CategoryAvatar from './CategoryAvatar';

interface TitleExtraProps {
  category: string;
  highlight?: boolean;
  score: number;
}

const TitleExtra = memo<TitleExtraProps>(({ category, score, highlight }) => {
  const { t } = useTranslation('tool');

  return (
    <Flexbox align={'center'} gap={4} horizontal>
      <Tooltip title={t(highlight ? 'search.includedTooltip' : 'search.scoreTooltip')}>
        {highlight ? (
          <Tag bordered={false} color={'blue'} style={{ marginInlineEnd: 0 }}>
            {score.toFixed(1)}
          </Tag>
        ) : (
          <Typography.Text
            style={{ textAlign: 'center', width: 32, wordBreak: 'keep-all' }}
            type={'secondary'}
          >
            {score.toFixed(1)}
          </Typography.Text>
        )}
      </Tooltip>
      <CategoryAvatar category={category} />
    </Flexbox>
  );
});
export default TitleExtra;
