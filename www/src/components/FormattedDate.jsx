const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export function FormattedDate({ date, ...props }) {
  // Handle undefined or invalid dates
  if (!date) {
    return null
  }
  
  date = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return null
  }

  return (
    <time dateTime={date.toISOString()} {...props}>
      {dateFormatter.format(date)}
    </time>
  )
}
