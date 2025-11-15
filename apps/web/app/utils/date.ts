// Format date into Hh:mm Month Day, Year (or Month Day, Year if hasTime is false)
export const formatDate = ({
  date,
  hasTime = true
}: {
  date: Date | string | number | null | undefined
  hasTime?: boolean
}): string => {
  // Handle null or undefined
  if (date === null || date === undefined) {
    return 'N/A'
  }

  let dateObj: Date

  // Convert to Date object
  if (date instanceof Date) {
    dateObj = date
  } else if (typeof date === 'string') {
    // Try to parse string as ISO date or timestamp
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) {
      return 'Invalid Date'
    }
    dateObj = parsed
  } else if (typeof date === 'number') {
    // Handle Unix timestamp (could be seconds or milliseconds)
    // If timestamp is less than year 2000 in milliseconds, assume it's in seconds
    const timestamp = date < 946684800000 ? date * 1000 : date
    dateObj = new Date(timestamp)
    if (Number.isNaN(dateObj.getTime())) {
      return 'Invalid Date'
    }
  } else {
    return 'Invalid Date'
  }

  // Format options
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // Use 24-hour format (Hh:mm)
  }

  try {
    if (hasTime) {
      // Format: "Hh:mm Month Day, Year" (e.g., "14:30 January 15, 2024")
      const dateStr = dateObj.toLocaleDateString('en-US', dateOptions)
      const timeStr = dateObj.toLocaleTimeString('en-US', timeOptions)
      return `${timeStr} ${dateStr}`
    } else {
      // Format: "Month Day, Year" (e.g., "Jan 15, 2024")
      return dateObj.toLocaleDateString('en-US', dateOptions)
    }
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}