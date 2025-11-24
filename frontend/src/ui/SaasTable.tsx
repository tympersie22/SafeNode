import React from 'react'
import { motion } from 'framer-motion'

export interface TableColumn<T = any> {
  key: string
  header: string
  render?: (item: T, index: number) => React.ReactNode
  sortable?: boolean
  width?: string
}

export interface SaasTableProps<T = any> {
  columns: TableColumn<T>[]
  data: T[]
  onRowClick?: (item: T, index: number) => void
  className?: string
  emptyMessage?: string
  loading?: boolean
}

export const SaasTable = <T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  className = '',
  emptyMessage = 'No data available',
  loading = false,
}: SaasTableProps<T>) => {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <motion.tr
                key={index}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' : ''}
                onClick={() => onRowClick?.(item, index)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                  >
                    {column.render ? column.render(item, index) : item[column.key]}
                  </td>
                ))}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

