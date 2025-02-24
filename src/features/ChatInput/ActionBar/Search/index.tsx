import { ActionIcon } from '@lobehub/ui';
import { Popover } from 'antd';
import { useTheme } from 'antd-style';
import { Globe } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { isDeprecatedEdition } from '@/const/version';
import { useAgentEnableSearch } from '@/hooks/useAgentEnableSearch';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';

import AINetworkSettings from './SwitchPanel';

const Search = memo(() => {
  const { t } = useTranslation('chat');
  const [isLoading] = useAgentStore((s) => [agentSelectors.isAgentConfigLoading(s)]);
  const isAgentEnableSearch = useAgentEnableSearch();

  const isMobile = useIsMobile();

  const theme = useTheme();

  if (isLoading) return null;
  // <ActionIcon
  //   icon={Globe}
  //   placement={'bottom'}
  //   style={{
  //     cursor: 'not-allowed',
  //   }}
  // />

  return (
    !isDeprecatedEdition && (
      <Flexbox>
        <Popover
          arrow={false}
          content={<AINetworkSettings />}
          styles={{
            body: {
              minWidth: isMobile ? undefined : 200,
              padding: 4,
              width: isMobile ? '100vw' : undefined,
            },
          }}
        >
          <ActionIcon
            color={
              isAgentEnableSearch ? (theme.isDarkMode ? theme.cyan7 : theme.cyan10) : undefined
            }
            icon={Globe}
            placement={'bottom'}
            title={t('search.title')}
          />
        </Popover>
      </Flexbox>
    )
  );
});

Search.displayName = 'Search';

export default Search;
