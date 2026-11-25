FROM postgres:16-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends python3-venv ca-certificates && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/patroni \
 && /opt/patroni/bin/pip install --no-cache-dir 'patroni[etcd3,psycopg3]==4.1.5'
ENV PATH="/opt/patroni/bin:$PATH"
COPY patroni.yml /etc/patroni.yml
USER postgres
ENTRYPOINT ["/opt/patroni/bin/patroni"]
CMD ["/etc/patroni.yml"]
