  // Helper function to format document dates
  const formatDocumentDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    
    try {
      // Handle different date formats
      let date

      // If it's already a valid date string with timezone
      if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('Z'))) {
        date = new Date(dateString)
      } else {
        // If it's a simple date string, parse it
        date = new Date(dateString)
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date'
      }

      // Format for South African locale
      return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Africa/Johannesburg'
      })
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString)
      return 'Date error'
    }
  }
