# Task 3

## Transactions

To guarantee atomicity of order creation as a single unit `dataSource.transaction(...)`
method is used. This method ensures that DB operations will be commited within a single
transaction, otherwise, in case of an exception, everything will be rolled back.

With this transactional approach we ensure that no partial writes can occur and
our state is consistent in any given point in time.

## Idempotency

To prevent a double submission problem POST /orders endpoint requires a client
to send a special HTTP header called "Idempotency-Key". Conceptually, client
is responsible for creating, storing and sending an unique identifier
(generated with UUIDv4) to a server, so that the server can spot a double submission
of an order. This identifier lives for as long as client session lives, and once
it has successfully been submitted to server, server stores it in DB along with
other order-related information.

The first successful request with "Idempotency-Key" header creates an order and saves
idempotency key as an `idempotency_key` column of the `orders` table. Database schema
is designed to ensure uniqueness of (user_id, idempotency_key) pair.
Any subsequent request with the same value of "Idempotency-Key" header returns
an already created order.

## Concurrency

As a response to oversell problem during order creation, a pessimistic locking of DB
rows was choosen. The idea is to prevent concurrent reads and writes from other users requests reading rows
of the `products` table, while these rows are processed by our business logic within the order
creation use-case. Basically, we assume that there are lots of concurrent requests that 
want to mutate the same products, so we lock our products data with 
"pessimistic_write" lock to prevent race conditions between those requests.

## SQL Optimization

As a "hot" request for optimization "List of orders for a given users 
with status/date filtering" was choosen.


Query:
```sql
explain (analyze,
buffers)
select
	"orders"."id" as "orders_id",
	"orders"."status" as "orders_status",
	"orders"."created_at" as "orders_created_at",
	"items"."order_id" as "items_order_id",
	"items"."product_id" as "items_product_id",
	"items"."qty" as "items_qty",
	"items"."purchase_price" as "items_purchase_price"
from
	"orders" "orders"
left join "order_items" "items" on
	"items"."order_id" = "orders"."id"
where
	"orders"."user_id" = '69eaf218-2161-40bf-a23e-8af48e459acd'
	and "orders"."status" = 'created'
	and "orders"."created_at" >= '2026-02-23'
	and "orders"."created_at" <= now()
order by
	"orders_created_at" desc
```

Before:
```
QUERY PLAN                                                                                                                                                                                                                          |
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
Gather Merge  (cost=7460.08..7479.17 rows=166 width=70) (actual time=12.164..13.833 rows=321 loops=1)                                                                                                                               |
  Workers Planned: 1                                                                                                                                                                                                                |
  Workers Launched: 1                                                                                                                                                                                                               |
  Buffers: shared hit=3762                                                                                                                                                                                                          |
  ->  Sort  (cost=6460.07..6460.49 rows=166 width=70) (actual time=4.209..4.236 rows=160 loops=2)                                                                                                                                   |
        Sort Key: orders.created_at DESC                                                                                                                                                                                            |
        Sort Method: quicksort  Memory: 55kB                                                                                                                                                                                        |
        Buffers: shared hit=3762                                                                                                                                                                                                    |
        Worker 0:  Sort Method: quicksort  Memory: 25kB                                                                                                                                                                             |
        ->  Nested Loop Left Join  (cost=0.42..6453.95 rows=166 width=70) (actual time=0.021..4.140 rows=160 loops=2)                                                                                                               |
              Buffers: shared hit=3754                                                                                                                                                                                              |
              ->  Parallel Seq Scan on orders  (cost=0.00..5117.36 rows=166 width=28) (actual time=0.014..3.641 rows=160 loops=2)                                                                                                   |
                    Filter: ((created_at >= '2026-02-23 00:00:00+02'::timestamp with time zone) AND (user_id = '69eaf218-2161-40bf-a23e-8af48e459acd'::uuid) AND (status = 'created'::orders_status_enum) AND (created_at <= now()))|
                    Rows Removed by Filter: 99851                                                                                                                                                                                   |
                    Buffers: shared hit=2470                                                                                                                                                                                        |
              ->  Index Scan using "PK_order_items_order_id_product_id" on order_items items  (cost=0.42..8.04 rows=1 width=42) (actual time=0.003..0.003 rows=1 loops=321)                                                         |
                    Index Cond: (order_id = orders.id)                                                                                                                                                                              |
                    Buffers: shared hit=1284                                                                                                                                                                                        |
Planning:                                                                                                                                                                                                                           |
  Buffers: shared hit=16                                                                                                                                                                                                            |
Planning Time: 0.266 ms                                                                                                                                                                                                             |
Execution Time: 13.879 ms                                                                                                                                                                                                           |
```

After:
```
QUERY PLAN                                                                                                                                                                                                                              |
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
Sort  (cost=3116.44..3117.15 rows=283 width=70) (actual time=1.694..1.714 rows=321 loops=1)                                                                                                                                             |
  Sort Key: orders.created_at DESC                                                                                                                                                                                                      |
  Sort Method: quicksort  Memory: 55kB                                                                                                                                                                                                  |
  Buffers: shared hit=1589                                                                                                                                                                                                              |
  ->  Nested Loop Left Join  (cost=13.16..3104.91 rows=283 width=70) (actual time=0.166..1.548 rows=321 loops=1)                                                                                                                        |
        Buffers: shared hit=1589                                                                                                                                                                                                        |
        ->  Bitmap Heap Scan on orders  (cost=12.74..826.27 rows=283 width=28) (actual time=0.149..0.445 rows=321 loops=1)                                                                                                              |
              Recheck Cond: ((user_id = '69eaf218-2161-40bf-a23e-8af48e459acd'::uuid) AND (status = 'created'::orders_status_enum) AND (created_at >= '2026-02-23 00:00:00+02'::timestamp with time zone) AND (created_at <= now()))    |
              Heap Blocks: exact=300                                                                                                                                                                                                    |
              Buffers: shared hit=305                                                                                                                                                                                                   |
              ->  Bitmap Index Scan on "IX_orders_user_id_status_created_at"  (cost=0.00..12.67 rows=283 width=0) (actual time=0.092..0.093 rows=321 loops=1)                                                                           |
                    Index Cond: ((user_id = '69eaf218-2161-40bf-a23e-8af48e459acd'::uuid) AND (status = 'created'::orders_status_enum) AND (created_at >= '2026-02-23 00:00:00+02'::timestamp with time zone) AND (created_at <= now()))|
                    Buffers: shared hit=5                                                                                                                                                                                               |
        ->  Index Scan using "PK_order_items_order_id_product_id" on order_items items  (cost=0.42..8.04 rows=1 width=42) (actual time=0.003..0.003 rows=1 loops=321)                                                                   |
              Index Cond: (order_id = orders.id)                                                                                                                                                                                        |
              Buffers: shared hit=1284                                                                                                                                                                                                  |
Planning:                                                                                                                                                                                                                               |
  Buffers: shared hit=16                                                                                                                                                                                                                |
Planning Time: 0.367 ms                                                                                                                                                                                                                 |
Execution Time: 1.783 ms                                                                                                                                                                                                                |
```

Analysis & Conclusion:
- Previously, planner used Parallel Seq Scan to filter orders with 
  conditions specified in the `where` clause of the query, which was a potenial bottle-neck;
- To mitigate this problem and optimize the query "IX_orders_user_id_status_created_at"
  was applied;
- The optimization decreased execution time 8x compared to the initial "Before" execution plan;
- Given the high selectivity of the query it was optimal for the planner to opt
  for Bitmap Index Scan using the created index. Also, it impacted the planner's decision on choosing Index Scan using
  "PK_order_items_order_id_product_id" - for an altered query with lower selectivity planner chooses Parallel Seq Scan here.
