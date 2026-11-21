#
# ookla-speedtest: the official Speedtest CLI from Ookla.
#
# The CLI is distributed under Ookla's own EULA, which does not allow
# redistribution. It is therefore a private/self-use package: the registry marks
# it publicAllowed: false and it must never be promoted into a public feed.
#
# Upstream: https://install.speedtest.net/app/cli/ookla-speedtest-1.2.0-linux-x86_64.tgz
# Size:     1,106,829 B (sha256 pinned below; the upstream feed used skip)
#
include $(TOPDIR)/rules.mk

PKG_NAME:=ookla-speedtest
PKG_VERSION:=1.2.0
PKG_RELEASE:=19

PKG_SOURCE:=ookla-speedtest-1.2.0-linux-x86_64.tgz
PKG_SOURCE_URL:=https://install.speedtest.net/app/cli
PKG_HASH:=5690596c54ff9bed63fa3732f818a05dbc2db19ad36ed68f21ca5f64d5cfeeb7

PKG_BUILD_DIR:=$(BUILD_DIR)/ookla-speedtest-1.2.0-linux-x86_64
PKG_LICENSE:=LicenseRef-Ookla-Speedtest-EULA

include $(INCLUDE_DIR)/package.mk

define Package/ookla-speedtest
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Speed Test
  TITLE:=Speedtest CLI by Ookla (prebuilt, EULA-restricted)
  URL:=https://www.speedtest.net/apps/cli
  DEPENDS:=@x86_64 +ca-certificates
endef

define Package/ookla-speedtest/description
  Official Ookla Speedtest CLI. Redistribution is not allowed by Ookla's EULA,
  so the registry marks it publicAllowed: false and it stays out of public feeds.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(TAR) -xzf $(DL_DIR)/$(PKG_SOURCE) -C $(PKG_BUILD_DIR)
endef

define Build/Compile
endef

define Package/ookla-speedtest/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/speedtest $(1)/usr/bin/ookla-speedtest
endef

$(eval $(call BuildPackage,ookla-speedtest))
