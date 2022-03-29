import React from 'react'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { observer } from 'mobx-react-lite'
import { withAuth } from 'hooks'
import { LogsExplorerLayout } from 'components/layouts/'
import { LogsTableName } from 'components/interfaces/Settings/Logs'
import LogsPreviewer from 'components/interfaces/Settings/Logs/LogsPreviewer'

export const LogPage: NextPage = () => {
  const router = useRouter()
  const { ref, source } = router.query

  return (
    <LogsExplorerLayout subtitle={<span className="font-mono">{source}</span>}>
      <LogsPreviewer
        projectRef={ref as string}
        condensedLayout={true}
        tableName={source as LogsTableName}
      />
    </LogsExplorerLayout>
  )
}

export default withAuth(observer(LogPage))
