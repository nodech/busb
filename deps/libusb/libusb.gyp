{
  "variables": {
    "use_udev%": 1
  },
  "targets": [{
    "target_name": "libusb",
    "type": "static_library",
    "variables": {
      "lusbversion": "1.0.19"
    },
    "sources": [
      "../../libusb_config/config.h",
      "libusb-<(lusbversion)/libusb/core.c",
      "libusb-<(lusbversion)/libusb/descriptor.c",
      "libusb-<(lusbversion)/libusb/hotplug.c",
      "libusb-<(lusbversion)/libusb/hotplug.h",
      "libusb-<(lusbversion)/libusb/io.c",
      "libusb-<(lusbversion)/libusb/libusb.h",
      "libusb-<(lusbversion)/libusb/libusbi.h",
      "libusb-<(lusbversion)/libusb/strerror.c",
      "libusb-<(lusbversion)/libusb/sync.c",
      "libusb-<(lusbversion)/libusb/version.h",
      "libusb-<(lusbversion)/libusb/version_nano.h"
    ],
    "include_dirs": [
      "../../libusb_config",
      "libusb-<(lusbversion)/libusb",
      "libusb-<(lusbversion)/libusb/os"
    ],
    "direct_dependent_settings": {
      "include_dirs": [
        "libusb-<(lusbversion)/libusb"
      ]
    },
    "defines": [
      "ENABLE_LOGGING=1"
    ],
    "cflags": [
      "-w"
    ],
    "conditions": [
      [ "OS == 'linux' or OS == 'android' or OS == 'mac'", {
        "sources": [
          "libusb-<(lusbversion)/libusb/os/poll_posix.c",
          "libusb-<(lusbversion)/libusb/os/poll_posix.h",
          "libusb-<(lusbversion)/libusb/os/threads_posix.c",
          "libusb-<(lusbversion)/libusb/os/threads_posix.h"
        ],
        "defines": [
          "DEFAULT_VISIBILITY=",
          "HAVE_GETTIMEOFDAY=1",
          "HAVE_POLL_H=1",
          "HAVE_SYS_TIME_H=1",
          "LIBUSB_DESCRIBE='1.0.17'",
          "POLL_NFDS_TYPE=nfds_t",
          "THREADS_POSIX=1"
        ]
      }],
      [ "OS == 'linux' or OS == 'android'", {
        "sources": [
          "libusb-<(lusbversion)/libusb/os/linux_usbfs.c",
          "libusb-<(lusbversion)/libusb/os/linux_usbfs.h"
        ],
        "defines": [
          "OS_LINUX=1",
          "_GNU_SOURCE=1",
          "USBI_TIMERFD_AVAILABLE=1"
        ]
      }],
      [ "OS == 'linux' and use_udev == 1 or OS == 'android'", {
        "sources": [
          "libusb-<(lusbversion)/libusb/os/linux_udev.c"
        ],
        "defines": [
          "HAVE_LIBUDEV=1",
          "USE_UDEV=1"
        ],
        "direct_dependent_settings": {
          "libraries": [
            "-ludev"
          ]
        }
      }],
      [ "OS == 'linux' and use_udev == 0", {
        "sources": [
          "libusb-<(lusbversion)/libusb/os/linux_netlink.c"
        ],
        "defines": [
          "HAVE_LINUX_NETLINK_H"
        ],
        "conditions": [
          ["clang==1", {
            "cflags": [
              "-Wno-pointer-sign"
            ]
          }]
        ]
      }],
      [ "OS == 'mac'", {
        "sources": [
          "libusb-<(lusbversion)/libusb/os/darwin_usb.c",
          "libusb-<(lusbversion)/libusb/os/darwin_usb.h"
        ],
        "defines": [
          "OS_DARWIN=1"
        ]
      }],
      [ "OS == 'win'", {
        "sources": [
          "libusb-<(lusbversion)/libusb/os/poll_windows.c",
          "libusb-<(lusbversion)/libusb/os/poll_windows.h",
          "libusb-<(lusbversion)/libusb/os/threads_windows.c",
          "libusb-<(lusbversion)/libusb/os/threads_windows.h",
          "libusb-<(lusbversion)/libusb/os/windows_common.h",
          "libusb-<(lusbversion)/libusb/os/windows_usb.c",
          "libusb-<(lusbversion)/libusb/os/windows_usb.h",
          "libusb-<(lusbversion)/msvc/config.h",
          "libusb-<(lusbversion)/msvc/inttypes.h",
          "libusb-<(lusbversion)/msvc/stdint.h"
        ],
        "include_dirs!": [
          "../../libusb_config"
        ],
        "include_dirs": [
          "libusb-<(lusbversion)/msvc"
        ],
        "msvs_disabled_warnings": [ 4267 ]
      }]
    ]
  }]
}
