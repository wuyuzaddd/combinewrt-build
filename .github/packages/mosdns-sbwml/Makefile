# Repackage the sbwml mosdns core binary from its pinned 25.12 release bundle.
#
# The upstream project builds this with golang; our extension SDK has no Go
# toolchain, so instead of compiling we take the pinned prebuilt payload and
# wrap it in our own signed package. PKG_HASH pins the exact release tarball,
# which keeps the provenance reviewable without a Go build farm.
include $(TOPDIR)/rules.mk

PKG_NAME:=mosdns-sbwml
PKG_VERSION:=5.3.4
PKG_RELEASE:=15

PKG_SOURCE:=x86_64-openwrt-25.12.tar.gz
PKG_SOURCE_URL:=https://github.com/sbwml/luci-app-mosdns/releases/download/v5.3.4-r15
PKG_HASH:=d7147e3e7af7e2c7e849f3f501d06ec5bfbc8630c26267ee609c4b8601626e2c
PKG_LICENSE:=GPL-3.0-only
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=sbwml <admin@cooluc.com> (repackaged by combinewrt)

PKG_BUILD_DIR:=$(BUILD_DIR)/mosdns-$(PKG_VERSION)
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=IP Addresses and Names
  TITLE:=A plug-in DNS forwarder/splitter (sbwml prebuilt)
  URL:=https://github.com/IrineSistiana/mosdns
  DEPENDS:=+ca-bundle
endef

define Build/Compile
	mkdir -p $(PKG_BUILD_DIR)/payload
	apk_file=$$(find $(PKG_BUILD_DIR) -maxdepth 3 -name 'mosdns-*.apk' | head -n1); \
	test -n "$$apk_file"; \
	cd $(PKG_BUILD_DIR)/payload && \
		$(STAGING_DIR_HOST)/bin/apk extract --allow-untrusted "$$apk_file"
	rm -rf $(PKG_BUILD_DIR)/payload/lib/apk
endef

define Package/$(PKG_NAME)/install
	$(CP) $(PKG_BUILD_DIR)/payload/. $(1)/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
