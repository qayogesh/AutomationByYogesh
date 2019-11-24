package com.yogesh.automation.dataStructure;

import java.util.HashSet;

public class ArrayFindManyduplicatesElements {

	public static void main(String[] args) {
		ArrayFindManyduplicatesElements obj = new ArrayFindManyduplicatesElements();
		int[] arr = { 5, 3, 5, 67, 8, 6, 4, 5, 98, 3, 5, 76, 89, 1, 3, 3, 67 };
		obj.getDuplicates(arr);
	}

	private void getDuplicates(int[] arr) {
		int len = arr.length;
		HashSet set = new HashSet<>();

		for (int i = 0; i < len; i++) {
			if (set.add(arr[i]) == false) {
				System.out.println("duplicate #" + arr[i] + "/n");
			}
		}
	}
}

/** output
duplicate #5/n
duplicate #5/n
duplicate #3/n
duplicate #5/n
duplicate #3/n
duplicate #3/n
duplicate #67/n



**/