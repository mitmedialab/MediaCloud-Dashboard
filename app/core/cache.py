#import hermes.backend.memcached
#cache = hermes.Hermes(hermes.backend.memcached.Backend, ttl=86400)	# one day

import hermes.backend.redis
cache = hermes.Hermes(hermes.backend.redis.Backend, host='localhost', db=2, ttl=86400)  # one day
