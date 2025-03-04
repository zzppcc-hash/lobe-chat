import { ModelIcon } from '@lobehub/icons';
import { Icon, Tooltip } from '@lobehub/ui';
import { Segmented } from 'antd';
import { createStyles } from 'antd-style';
import { ArrowDownToDot, ArrowUpFromDot, CircleFadingArrowUp } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { LobeDefaultAiModelListItem } from '@/types/aiModel';
import { ModelPriceCurrency } from '@/types/llm';
import { formatPriceByCurrency } from '@/utils/format';

export const useStyles = createStyles(({ css, token }) => {
  return {
    container: css`
      font-size: 12px;
    `,
    desc: css`
      line-height: 12px;
      color: ${token.colorTextDescription};
    `,
    pricing: css`
      font-size: 12px;
      color: ${token.colorTextSecondary};
    `,
  };
});

interface ModelCardProps extends LobeDefaultAiModelListItem {
  provider: string;
}

const ModelCard = memo<ModelCardProps>(({ pricing, id, provider, displayName }) => {
  const { t } = useTranslation('chat');
  const { styles } = useStyles();

  const isShowCredit = useGlobalStore(systemStatusSelectors.isShowCredit) && !!pricing;
  const updateSystemStatus = useGlobalStore((s) => s.updateSystemStatus);

  const inputPrice = formatPriceByCurrency(pricing?.input, pricing?.currency as ModelPriceCurrency);
  const cachedInputPrice = formatPriceByCurrency(
    pricing?.cachedInput,
    pricing?.currency as ModelPriceCurrency,
  );
  const outputPrice = formatPriceByCurrency(
    pricing?.output,
    pricing?.currency as ModelPriceCurrency,
  );
  return (
    <>
      <Flexbox
        align={'center'}
        className={styles.container}
        flex={1}
        gap={40}
        horizontal
        justify={'space-between'}
      >
        <Flexbox align={'center'} gap={8} horizontal>
          <ModelIcon model={id} size={22} />
          <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
            <Flexbox align={'center'} gap={8} horizontal style={{ lineHeight: '12px' }}>
              {displayName || id}
            </Flexbox>
            <span className={styles.desc}>{provider}</span>
          </Flexbox>
        </Flexbox>
        {!!pricing && (
          <Flexbox>
            <Segmented
              onChange={(value) => {
                updateSystemStatus({ isShowCredit: value === 'credit' });
              }}
              options={[
                { label: 'Token', value: 'token' },
                {
                  label: (
                    <Tooltip title={t('messages.modelCard.creditTooltip')}>
                      {t('messages.modelCard.credit')}
                    </Tooltip>
                  ),
                  value: 'credit',
                },
              ]}
              size={'small'}
              value={isShowCredit ? 'credit' : 'token'}
            />
          </Flexbox>
        )}
      </Flexbox>
      {isShowCredit && (
        <Flexbox horizontal justify={'space-between'}>
          <div />
          <Flexbox align={'center'} className={styles.pricing} gap={8} horizontal>
            {t('messages.modelCard.creditPricing')}:
            {pricing?.cachedInput && (
              <Tooltip
                title={t('messages.modelCard.pricing.inputCachedTokens', {
                  amount: cachedInputPrice,
                })}
              >
                <Flexbox gap={2} horizontal>
                  <Icon icon={CircleFadingArrowUp} />
                  {cachedInputPrice}
                </Flexbox>
              </Tooltip>
            )}
            <Tooltip title={t('messages.modelCard.pricing.inputTokens', { amount: inputPrice })}>
              <Flexbox gap={2} horizontal>
                <Icon icon={ArrowUpFromDot} />
                {inputPrice}
              </Flexbox>
            </Tooltip>
            <Tooltip title={t('messages.modelCard.pricing.outputTokens', { amount: outputPrice })}>
              <Flexbox gap={2} horizontal>
                <Icon icon={ArrowDownToDot} />
                {outputPrice}
              </Flexbox>
            </Tooltip>
          </Flexbox>
        </Flexbox>
      )}
    </>
  );
});

export default ModelCard;
