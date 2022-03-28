import React, { useEffect, useReducer, useState } from 'react'
import { useRouter } from 'next/router'
import {
  Typography,
  IconLoader,
  IconAlertCircle,
  IconRewind,
  Button,
  Card,
  Input,
} from '@supabase/ui'

import {
  LogTable,
  LogTemplate,
  TEMPLATES,
  LogSearchCallback,
  LogsTableName,
  filterSqlWhereBuilder,
  filterReducer,
  QueryType,
  LogEventChart,
} from 'components/interfaces/Settings/Logs'
import dayjs from 'dayjs'
import useLogsPreview from 'hooks/analytics/useLogsPreview'
import PreviewFilterPanel from 'components/interfaces/Settings/Logs/PreviewFilterPanel'

import { LOGS_TABLES } from './Logs.constants'
import { Override } from './Logs.types'
import ShimmeringLoader from 'components/ui/ShimmeringLoader'
import ShimmerLine from 'components/ui/ShimmerLine'
import LoadingOpacity from 'components/ui/LoadingOpacity'

/**
 * Acts as a container component for the entire log display
 *
 * ## Query Params Syncing
 * Query params are synced on query submission.
 *
 * params used are:
 * - `s` for search query.
 * - `te` for timestamp start value.
 */
interface Props {
  projectRef: string
  queryType?: keyof typeof LOGS_TABLES
  tableName?: LogsTableName
  override?: Override
  condensedLayout?: Boolean
}
export const LogsPreviewer: React.FC<Props> = ({
  projectRef,
  queryType,
  tableName,
  override,
  condensedLayout = false,
}) => {
  const router = useRouter()
  const { s, te, ts } = router.query
  const [showChart, setShowChart] = useState(true)

  const [whereFilters, dispatchWhereFilters] = useReducer(filterReducer, {})

  const table = queryType ? LOGS_TABLES[queryType] : tableName

  if (!table) {
    throw new Error(`A valid table name needs to be specified for LogsPreviewer to build queries.`)
  }

  const [
    { error, logData, params, newCount, filters, isLoading, oldestTimestamp },
    { loadOlder, setFilters, refresh, setTo, setFrom },
  ] = useLogsPreview(projectRef as string, table, {
    initialFilters: { search_query: s as string },
    whereStatementFactory: (filterObj) => `${
      filterObj.search_query
        ? `where REGEXP_CONTAINS(event_message, '${filterObj.search_query}')`
        : ''
    }
    ${filterSqlWhereBuilder(whereFilters, table, override).join('\n')}`,
  })

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search_query: s as string }))
    if (te) {
      setTo(te as string)
    } else {
      setTo('')
    }
    if (ts) {
      setFrom(ts as string)
    } else {
      setFrom('')
    }
  }, [s, te, ts])

  const onSelectTemplate = (template: LogTemplate) => {
    setFilters((prev) => ({ ...prev, search_query: template.searchString }))
  }

  // useEffect(() => {
  //   // runs when any of the filters change
  //   handleRefresh()
  // }, [whereFilters])

  const handleRefresh = () => {
    refresh()
    router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        te: undefined,
        ts: undefined,
        // ...whereFilters,
      },
    })
  }

  const handleSearch: LogSearchCallback = ({ query, to, from, fromMicro, toMicro }) => {
    let toValue, fromValue
    if (to || toMicro) {
      toValue = toMicro ? toMicro : dayjs(to).valueOf() * 1000

      setTo(String(toValue))
    }
    if (from || fromMicro) {
      fromValue = fromMicro ? fromMicro : dayjs(from).valueOf() * 1000
      setFrom(String(fromValue))
    }
    setFilters((prev) => ({ ...prev, search_query: query || '' }))

    router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        s: query || '',
        ts: fromValue,
        te: toValue,
      },
    })
  }

  return (
    <div className="h-full flex flex-col flex-grow gap-4">
      <PreviewFilterPanel
        isShowingEventChart={showChart}
        onToggleEventChart={() => setShowChart(!showChart)}
        isCustomQuery={false}
        isLoading={isLoading}
        newCount={newCount}
        templates={TEMPLATES.filter(
          (template) => queryType && template.for?.includes(queryType) && template.mode === 'simple'
        )}
        onRefresh={handleRefresh}
        onSearch={handleSearch}
        defaultSearchValue={filters.search_query}
        defaultToValue={
          params.timestamp_end ? dayjs(Number(params.timestamp_end) / 1000).toISOString() : ''
        }
        defaultFromValue={
          params.timestamp_start
            ? dayjs(Number(params.timestamp_start) / 1000).toISOString()
            : oldestTimestamp
            ? dayjs(Number(oldestTimestamp) / 1000).toISOString()
            : ''
        }
        onCustomClick={() => {
          router.push(`/project/${projectRef}/logs-explorer?q=${params.rawSql}`)
        }}
        onSelectTemplate={onSelectTemplate}
        dispatchWhereFilters={dispatchWhereFilters}
        whereFilters={whereFilters}
        table={table}
        condensedLayout={condensedLayout}
      />
      {showChart && !isLoading ? (
        <div className={condensedLayout ? 'px-4' : ''}>
          <LogEventChart
            data={!isLoading ? logData : undefined}
            onBarClick={(timestampMicro) => {
              handleSearch({ query: filters.search_query, toMicro: timestampMicro })
            }}
          />
        </div>
      ) : null}
      <div className="flex flex-col flex-grow relative">
        {isLoading && <div className="logs-shimmering-loader w-full h-0.5"></div>}
        <ShimmerLine active={isLoading} />
        <LoadingOpacity active={isLoading}>
          <LogTable data={logData} queryType={queryType} />
        </LoadingOpacity>
        <div className="p-2">
          <Button onClick={() => loadOlder()} icon={<IconRewind />} type="default">
            Load older
          </Button>
        </div>
        {error && (
          <div className="flex w-full h-full justify-center items-center mx-auto">
            <Card className="flex flex-col gap-y-2  w-2/5 bg-scale-400">
              <div className="flex flex-row gap-x-2 py-2">
                <IconAlertCircle size={16} />
                <Typography.Text type="secondary">
                  Sorry! An error occured when fetching data.
                </Typography.Text>
              </div>
              <Input.TextArea
                label="Error Messages"
                value={JSON.stringify(error, null, 2)}
                borderless
                className=" border-t-2 border-scale-800 pt-2 font-mono"
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default LogsPreviewer
