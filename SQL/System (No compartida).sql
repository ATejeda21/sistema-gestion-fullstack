SELECT
    c.CategoryName,
    p.ProductName
FROM Products p
JOIN Categories c ON c.CategoryID = p.CategoryID
ORDER BY c.CategoryName, p.ProductName;